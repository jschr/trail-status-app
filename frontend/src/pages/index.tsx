import { useNavigate } from 'react-router';
import { useSelectedRegionId } from '@/hooks/use-selected-region-id';

export function Index() {
  const navigate = useNavigate();

  const { data: selectedRegionId, isFetched } = useSelectedRegionId();

  if (!selectedRegionId && isFetched) {
    navigate('/login');
  } else if (selectedRegionId) {
    navigate(`/regions/${selectedRegionId}`);
  }

  return null;
}
