import { useParams } from 'react-router';

export function ObjectDetail() {
  const { objectId } = useParams<{ objectId: string }>();
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold">Object Detail</h1>
      <p className="text-muted-foreground mt-2">Loading object {objectId}...</p>
    </div>
  );
}
