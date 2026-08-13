import { ClientToggleButton } from "./ClientToggleButton";

type ClientRow = { id: string; name: string; isActive: boolean };

export function ClientsTable({ clients }: { clients: ClientRow[] }) {
  if (clients.length === 0) {
    return (
      <p className="text-body-md text-on-surface-variant rounded-lg border border-outline-variant p-8 text-center">
        No employers yet. Add one above.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-outline-variant">
      <table className="w-full text-left text-body-md">
        <thead className="bg-surface-container-low text-label-sm uppercase text-on-surface-variant">
          <tr>
            <th className="px-4 py-3">Employer</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant">
          {clients.map((client) => (
            <tr key={client.id} className="hover:bg-surface-container-lowest">
              <td className="px-4 py-3 font-bold text-on-surface">{client.name}</td>
              <td className="px-4 py-3">
                <span
                  className={`inline-block rounded-full px-3 py-1 text-label-sm font-bold ${
                    client.isActive
                      ? "bg-secondary-container text-on-secondary-container"
                      : "bg-surface-container-high text-on-surface-variant"
                  }`}
                >
                  {client.isActive ? "Active" : "Inactive"}
                </span>
              </td>
              <td className="px-4 py-3 text-right">
                <ClientToggleButton clientId={client.id} isActive={client.isActive} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
