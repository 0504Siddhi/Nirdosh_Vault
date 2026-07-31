import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { DocumentStore, AnalysisStore } from '../models/store';
import { runConsensusEngine } from '../services/consensusService';
import {
  buildCorrectionKit,
  generateGuidance,
} from '../services/guidanceService';
import { generateChecklist } from '../services/checklistService';
import { AuditService } from '../services/auditService';
import logger from '../services/logger';

const router = Router();

function normalizeSensitiveKey(fieldKey: unknown): string {
  return String(fieldKey ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

function isSensitiveField(fieldKey: unknown): boolean {
  const key = normalizeSensitiveKey(fieldKey);

  const sensitiveKeys = new Set([
    'aadhaar',
    'aadhar',
    'aadhaar_number',
    'aadhar_number',
    'aadhaar_no',
    'aadhar_no',
    'aadhaar_card_number',
    'aadhar_card_number',
    'uid',
    'uid_number',
    'uidai',
    'uidai_number',
    'unique_identification_number',
    'pan',
    'pan_no',
    'pan_number',
    'pan_card',
    'pan_card_no',
    'pan_card_number',
    'permanent_account_number',
  ]);

  return sensitiveKeys.has(key);
}

function compactIdentifier(value: unknown): string {
  return String(value ?? '')
    .trim()
    .replace(/[\s-]+/g, '')
    .toUpperCase();
}

function looksLikeAadhaar(value: unknown): boolean {
  return /^\d{12}$/.test(compactIdentifier(value));
}

function looksLikePan(value: unknown): boolean {
  return /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(
    compactIdentifier(value)
  );
}

function maskIdentifier(
  fieldKey: unknown,
  value: unknown
): string {
  const compactValue = compactIdentifier(value);

  if (!compactValue) {
    return '';
  }

  if (
    normalizeSensitiveKey(fieldKey).includes('pan') ||
    looksLikePan(compactValue)
  ) {
    return `••••${compactValue.slice(-5)}`;
  }

  return `••••${compactValue.slice(-4)}`;
}

function shouldMaskValue(
  fieldKey: unknown,
  value: unknown
): boolean {
  return (
    isSensitiveField(fieldKey) ||
    looksLikeAadhaar(value) ||
    looksLikePan(value)
  );
}

function sanitizeDocumentReference(
  reference: any,
  fieldKey: unknown
): any {
  if (!reference || typeof reference !== 'object') {
    return reference;
  }

  const sensitive = shouldMaskValue(
    fieldKey,
    reference.value
  );

  if (!sensitive) {
    return reference;
  }

  return {
    ...reference,
    value: maskIdentifier(fieldKey, reference.value),
    normalized: undefined,
    evidenceText: undefined,
  };
}

function sanitizeFieldResult(result: any): any {
  if (!result || typeof result !== 'object') {
    return result;
  }

  const fieldKey = result.fieldKey;
  const sensitive = isSensitiveField(fieldKey);

  return {
    ...result,

    consensusValue:
      sensitive ||
        shouldMaskValue(fieldKey, result.consensusValue)
        ? maskIdentifier(fieldKey, result.consensusValue)
        : result.consensusValue,

    evidence: Array.isArray(result.evidence)
      ? result.evidence.map((entry: any) =>
        sanitizeDocumentReference(entry, fieldKey)
      )
      : result.evidence,

    supportingDocs: Array.isArray(result.supportingDocs)
      ? result.supportingDocs.map((entry: any) =>
        sanitizeDocumentReference(entry, fieldKey)
      )
      : result.supportingDocs,

    outliers: Array.isArray(result.outliers)
      ? result.outliers.map((entry: any) =>
        sanitizeDocumentReference(entry, fieldKey)
      )
      : result.outliers,

    groups: Array.isArray(result.groups)
      ? result.groups.map((group: any) => ({
        ...group,

        value:
          sensitive ||
            shouldMaskValue(fieldKey, group.value)
            ? maskIdentifier(fieldKey, group.value)
            : group.value,

        docs: Array.isArray(group.docs)
          ? group.docs.map((doc: any) =>
            sanitizeDocumentReference(doc, fieldKey)
          )
          : group.docs,
      }))
      : result.groups,
  };
}

function safeAnalysis(analysis: any): any {
  if (!analysis) {
    return null;
  }

  return {
    ...analysis,

    fieldResults: Array.isArray(analysis.fieldResults)
      ? analysis.fieldResults.map(sanitizeFieldResult)
      : [],

    documentSpecificFields: Array.isArray(
      analysis.documentSpecificFields
    )
      ? analysis.documentSpecificFields.map((field: any) => {
        const sensitive = shouldMaskValue(
          field.fieldKey ?? field.fieldName,
          field.value
        );

        if (!sensitive) {
          return field;
        }

        return {
          ...field,
          value: maskIdentifier(
            field.fieldKey ?? field.fieldName,
            field.value
          ),
          normalized: undefined,
          evidenceText: undefined,
        };
      })
      : [],
  };
}

router.post(
  '/analyze',
  authenticate,
  async (
    req: AuthRequest,
    res: Response
  ): Promise<void> => {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
      });
      return;
    }

    const userDocs = DocumentStore.findByUser(
      req.user.id
    ).filter((document) => document.status === 'ready');

    if (userDocs.length < 2) {
      res.status(400).json({
        error:
          'At least 2 processed documents are required for analysis',
      });
      return;
    }

    try {
      AuditService.log(
        req.user.id,
        'analysis.started',
        {
          documentCount: userDocs.length,
        },
        req
      );

      /*
       * The consensus engine compares a field only when at least
       * two valid documents contain that field.
       */
      const engineData = runConsensusEngine(userDocs);

      const guidance = await generateGuidance(
        engineData.fieldResults
      );

      const checklist = generateChecklist(
        userDocs.map((document) => document.docType),
        engineData.documentSpecificFields
      );

      const analysis = AnalysisStore.create({
        userId: req.user.id,

        documentIds: userDocs.map(
          (document) => document._id
        ),

        status: 'complete',

        fieldResults: engineData.fieldResults,
        summary: engineData.summary,

        documentSpecificFields:
          engineData.documentSpecificFields,

        guidance,
        checklist,
      });

      AuditService.log(
        req.user.id,
        'analysis.completed',
        {
          analysisId: analysis._id,

          /*
           * The summary contains counts only and does not contain
           * extracted document values.
           */
          summary: engineData.summary,
        },
        req
      );

      res.status(201).json(safeAnalysis(analysis));
    } catch (error) {
      logger.error('Analysis failed', {
        error:
          error instanceof Error
            ? error.message
            : String(error),
      });

      res.status(500).json({
        error: 'Analysis failed',
      });
    }
  }
);

router.post(
  '/:id/correction-kit',
  authenticate,
  (
    req: AuthRequest,
    res: Response
  ): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
      });
      return;
    }

    const analysis = AnalysisStore.findById(
      req.params.id
    );

    if (
      !analysis ||
      analysis.userId !== req.user.id
    ) {
      res.status(404).json({
        error: 'Analysis not found',
      });
      return;
    }

    const { fieldKey, documentId } = req.body ?? {};

    if (
      typeof fieldKey !== 'string' ||
      !fieldKey.trim()
    ) {
      res.status(400).json({
        error: 'fieldKey is required',
      });
      return;
    }

    if (
      documentId !== undefined &&
      typeof documentId !== 'string'
    ) {
      res.status(400).json({
        error: 'documentId must be a string',
      });
      return;
    }

    const result = analysis.fieldResults.find(
      (fieldResult: any) =>
        fieldResult.fieldKey === fieldKey
    );

    if (!result) {
      res.status(404).json({
        error: 'Field result not found',
      });
      return;
    }

    const document = documentId
      ? DocumentStore.findById(documentId)
      : undefined;

    /*
     * A supplied document ID must exist. Previously, an invalid ID
     * silently produced a generic correction kit.
     */
    if (documentId && !document) {
      res.status(404).json({
        error: 'Selected document not found',
      });
      return;
    }

    if (
      document &&
      (!analysis.documentIds.includes(document._id) ||
        document.userId !== req.user.id)
    ) {
      res.status(400).json({
        error:
          'Selected document is not part of this analysis',
      });
      return;
    }

    const kit = buildCorrectionKit(
      analysis._id,
      result,
      document?.docType
    );

    AuditService.log(
      req.user.id,
      'correction_kit.requested',
      {
        analysisId: analysis._id,
        fieldKey,
        documentId,
        guideStatus: kit.guide_status,
      },
      req
    );

    /*
     * Correction kits should normally contain instructions, not raw
     * identifiers. Sanitize recursively as a defensive safeguard.
     */
    res.json(
      isSensitiveField(fieldKey)
        ? JSON.parse(
          JSON.stringify(kit, (_key, value) => {
            if (
              looksLikeAadhaar(value) ||
              looksLikePan(value)
            ) {
              return maskIdentifier(
                fieldKey,
                value
              );
            }

            return value;
          })
        )
        : kit
    );
  }
);

router.get(
  '/:id',
  authenticate,
  (
    req: AuthRequest,
    res: Response
  ): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
      });
      return;
    }

    const analysis = AnalysisStore.findById(
      req.params.id
    );

    if (
      !analysis ||
      analysis.userId !== req.user.id
    ) {
      res.status(404).json({
        error: 'Analysis not found',
      });
      return;
    }

    res.json(safeAnalysis(analysis));
  }
);

router.get(
  '/',
  authenticate,
  (
    req: AuthRequest,
    res: Response
  ): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
      });
      return;
    }

    const analyses = AnalysisStore.findByUser(
      req.user.id
    )
      .sort(
        (first: any, second: any) =>
          new Date(second.createdAt).getTime() -
          new Date(first.createdAt).getTime()
      )
      .map(safeAnalysis);

    res.json({
      analyses,
    });
  }
);

export default router;