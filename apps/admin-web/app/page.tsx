const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

async function getReports() {
  try {
    const response = await fetch(`${apiUrl}/admin/camera-reports`, { cache: "no-store" });
    if (!response.ok) return [];
    return response.json();
  } catch {
    return [];
  }
}

export default async function AdminHome() {
  const reports = await getReports();
  return (
    <main>
      <div className="toolbar">
        <div>
          <h1>Safety Reports</h1>
          <p>Review user-submitted traffic safety points.</p>
        </div>
        <span className="badge">{reports.length} pending</span>
      </div>
      <table className="table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Type</th>
            <th>Location</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {reports.map((report: any) => (
            <tr key={report.id}>
              <td>{report.title}</td>
              <td>{report.type}</td>
              <td>
                {report.lat}, {report.lng}
              </td>
              <td>{report.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
