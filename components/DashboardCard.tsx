type Props = {
  title: string;
  onClick?: () => void;
};

export function DashboardCard({ title, onClick }: Props) {
  return (
    <div
      onClick={onClick}
      className="cursor-pointer bg-blue-600 text-white p-6 rounded-xl shadow hover:bg-blue-700 transition"
    >
      <h3 className="text-lg font-semibold">{title}</h3>
    </div>
  );
}
