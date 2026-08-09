import { useNavigate } from 'react-router-dom';
import SchemeFinder from '../components/schemes/SchemeFinder';

export default function SchemeReadiness() {
  const navigate = useNavigate();

  return (
    <SchemeFinder
      onReviewConflict={(schemeId, docKeys) => {
        navigate(`/report?scheme=${schemeId}&docs=${docKeys.join(',')}`);
      }}
    />
  );
}
