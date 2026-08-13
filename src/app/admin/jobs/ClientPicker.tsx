import Link from "next/link";

type ClientOption = { id: string; name: string; isActive: boolean };

export function ClientPicker({
  clients,
  value,
  onChange,
}: {
  clients: ClientOption[];
  value: string;
  onChange: (clientId: string) => void;
}) {
  const options = clients.filter((client) => client.isActive || client.id === value);

  return (
    <div className="space-y-1">
      <label className="text-label-md text-on-surface-variant block mb-1" htmlFor="clientId">
        Employer (internal, optional)
      </label>
      <select
        id="clientId"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-12 px-4 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
      >
        <option value="">No employer on record</option>
        {options.map((client) => (
          <option key={client.id} value={client.id}>
            {client.name}
          </option>
        ))}
      </select>
      <Link href="/admin/clients" className="text-label-sm text-primary font-bold hover:underline inline-block mt-1">
        Manage employers
      </Link>
    </div>
  );
}
