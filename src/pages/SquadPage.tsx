import { useParams, Navigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { MemberList } from '../components/members/MemberList';
import { useAppStore } from '../store/useAppStore';
import { useAuth } from '../hooks/useAuth';
import type { AnyRole } from '../types';

export function SquadPage() {
  const { duId, rtId, sqId } = useParams<{ duId: string; rtId: string; sqId: string }>();
  const { data, addAssignmentToSquad, removeAssignmentFromSquad } = useAppStore();
  const { isAdmin } = useAuth();

  const du = data.deliveryUnits.find((d) => d.id === duId);
  const rt = du?.releaseTrains.find((r) => r.id === rtId);
  const sq = rt?.squads.find((s) => s.id === sqId);

  if (!du || !rt || !sq) return <Navigate to="/dashboard" replace />;

  return (
    <Layout
      title={sq.name}
      breadcrumbs={[
        { label: 'Dashboard', to: '/dashboard' },
        { label: du.name, to: `/delivery-units/${du.id}` },
        { label: rt.name, to: `/release-trains/${du.id}/${rt.id}` },
        { label: sq.name },
      ]}
    >
      {sq.description && <p className="text-sm text-gray-500 mb-6">{sq.description}</p>}

      <Card>
        <MemberList
          assignments={sq.assignments}
          people={data.people}
          availableRoles={data.roleConfig.squad as AnyRole[]}
          isAdmin={isAdmin}
          onAdd={(a) => addAssignmentToSquad(du.id, rt.id, sq.id, a)}
          onRemove={(personId, role) => removeAssignmentFromSquad(du.id, rt.id, sq.id, personId, role)}
        />
      </Card>
    </Layout>
  );
}
