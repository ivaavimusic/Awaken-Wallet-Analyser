import { Card } from "@/components/ui/card";
import { Activity, Box, Clock, CreditCard, Layers } from "lucide-react";

interface StatsGridProps {
    transactionCount: number;
    uniqueDays?: number;
    totalVolume?: string; // e.g. "12.5 ETH"
    gasSpent?: string;
    dailyActivity?: any[]; // transactions for chart
    className?: string;
}

export function StatsGrid({
    transactionCount = 0,
    uniqueDays = 0,
    totalVolume = "0",
    gasSpent = "0",
    dailyActivity = [],
    className
}: StatsGridProps) {

    // Calculate daily activity for chart
    const getDailyChartData = () => {
        if (!dailyActivity || dailyActivity.length === 0) {
            return Array(7).fill(0); // Empty chart
        }

        // Group transactions by date
        const dailyCount: Record<string, number> = {};
        const sortedTxs = [...dailyActivity].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

        sortedTxs.forEach((tx) => {
            const date = new Date(tx.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            dailyCount[date] = (dailyCount[date] || 0) + 1;
        });

        // Get last 7 days (or up to 7 days of data)
        const days = Object.keys(dailyCount).slice(-7);
        const values = days.map(d => dailyCount[d] || 0);

        // Normalize to 0-100 for chart height
        if (values.length === 0) return Array(7).fill(0);
        const max = Math.max(...values, 1);
        return values.map(v => Math.round((v / max) * 100));
    };

    const chartData = getDailyChartData();
    const hasData = dailyActivity && dailyActivity.length > 0;

    return (
        <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 ${className}`}>
            {/* Left Column: 4 small stats cards */}
            <div className="grid grid-cols-2 gap-4">
                {/* Total Txns */}
                <Card className="p-5 flex flex-col justify-between border-0 bg-card text-card-foreground">
                    <div className="flex items-center gap-3 text-muted-foreground mb-2">
                        <Box className="w-5 h-5" />
                        <span className="text-sm font-medium">Total Txns</span>
                    </div>
                    <div className="text-2xl font-bold tracking-tight">{transactionCount.toLocaleString()}</div>
                </Card>

                {/* Active Days */}
                <Card className="p-5 flex flex-col justify-between border-0 bg-card text-card-foreground">
                    <div className="flex items-center gap-3 text-muted-foreground mb-2">
                        <Clock className="w-5 h-5" />
                        <span className="text-sm font-medium">Active Days</span>
                    </div>
                    <div className="text-2xl font-bold tracking-tight">{uniqueDays}</div>
                </Card>

                {/* Total Volume */}
                <Card className="p-5 flex flex-col justify-between border-0 bg-card text-card-foreground">
                    <div className="flex items-center gap-3 text-muted-foreground mb-2">
                        <Activity className="w-5 h-5" />
                        <span className="text-sm font-medium">Total Volume</span>
                    </div>
                    <div className="text-2xl font-bold tracking-tight">{totalVolume}</div>
                </Card>

                {/* Gas Spent */}
                <Card className="p-5 flex flex-col justify-between border-0 bg-card text-card-foreground">
                    <div className="flex items-center gap-3 text-muted-foreground mb-2">
                        <CreditCard className="w-5 h-5" />
                        <span className="text-sm font-medium">Gas Spent</span>
                    </div>
                    <div className="text-2xl font-bold tracking-tight">{gasSpent}</div>
                </Card>

                {/* Wide card for Chain Status */}
                <Card className="col-span-2 p-5 flex flex-col justify-between border-0 bg-card text-card-foreground">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-muted-foreground">
                            <Layers className="w-5 h-5" />
                            <span className="text-sm font-medium">Chain Status</span>
                        </div>
                        <div className="px-3 py-1 rounded-full bg-green-500/20 text-green-500 text-xs font-bold">
                            ONLINE
                        </div>
                    </div>
                    <div className="text-2xl font-bold tracking-tight mt-2">Operational</div>
                </Card>
            </div>

            {/* Right Column: Activity Chart Area */}
            <Card className="p-6 border-0 bg-card text-card-foreground flex flex-col justify-between min-h-[250px] relative overflow-hidden">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-muted-foreground text-sm font-medium">Daily Activity</span>
                    </div>
                    <div className="text-3xl font-bold">{transactionCount > 0 ? transactionCount : 0}</div>
                </div>

                {/* Real Chart based on transaction data */}
                <div className="w-full h-32 mt-4 relative">
                    <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 600 120">
                        <defs>
                            <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="currentColor" stopOpacity="0.3" className="text-primary" />
                                <stop offset="100%" stopColor="currentColor" stopOpacity="0" className="text-primary" />
                            </linearGradient>
                        </defs>

                        {/* Area fill */}
                        {hasData ? (
                            <>
                                <path
                                    d={generateAreaPath(chartData)}
                                    fill="url(#gradient)"
                                />
                                <path
                                    d={generateLinePath(chartData)}
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    className="text-primary"
                                />

                                {/* Data points */}
                                {chartData.map((value, index) => {
                                    const x = (index / (chartData.length - 1 || 1)) * 600;
                                    const y = 120 - (value / 100) * 100;
                                    return (
                                        <circle
                                            key={index}
                                            cx={x}
                                            cy={y}
                                            r="3"
                                            className="fill-primary"
                                        />
                                    );
                                })}
                            </>
                        ) : (
                            // Empty state placeholder
                            <>
                                <path
                                    d="M0 100 C 50 100, 100 80, 150 90 S 250 100, 300 60 S 400 20, 450 40 S 550 80, 600 90 L 600 120 L 0 120 Z"
                                    fill="url(#gradient)"
                                    opacity="0.2"
                                />
                                <path
                                    d="M0 100 C 50 100, 100 80, 150 90 S 250 100, 300 60 S 400 20, 450 40 S 550 80, 600 90"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    className="text-primary/20"
                                />
                            </>
                        )}
                    </svg>
                </div>
            </Card>
        </div>
    );
}

// Generate SVG path commands for the area chart
function generateAreaPath(data: number[]): string {
    if (data.length === 0) return '';

    const points = data.map((value, index) => {
        const x = (index / (data.length - 1 || 1)) * 600;
        const y = 120 - (value / 100) * 100;
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    });

    return [...points, 'L 600 120', 'L 0 120', 'Z'].join(' ');
}

// Generate SVG path commands for the line chart
function generateLinePath(data: number[]): string {
    if (data.length === 0) return '';

    const points = data.map((value, index) => {
        const x = (index / (data.length - 1 || 1)) * 600;
        const y = 120 - (value / 100) * 100;
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    });

    return points.join(' ');
}
