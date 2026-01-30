export async function getDashboardOverview(
customerId: number,
startDate: string,
endDate: string,
platform: 'google' | 'meta' = 'google'
) {
const res = await fetch(
`/api/dashboard/overview?customerId=${customerId}&startDate=${startDate}&endDate=${endDate}&platform=${platform}`
);


return res.json();
}