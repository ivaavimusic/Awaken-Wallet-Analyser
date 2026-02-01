import { Card } from "@/components/ui/card";
import { ArrowUpRight } from "lucide-react";

export function PromoCards() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            {/* Awaken - Black Theme */}
            <Card className="p-6 bg-black text-white border-0 relative overflow-hidden group cursor-pointer hover:scale-[1.02] transition-transform h-48">
                <div className="relative z-10">
                    <h3 className="text-xl font-bold mb-2">Awaken</h3>
                    <p className="text-gray-400 text-sm mb-8 max-w-[70%]">
                        Crypto taxes for crypto natives 🤝
                    </p>
                    {/* Logo: Reduced size (w-36 h-36) | Moved slightly */}
                    <div className="absolute -bottom-8 -right-4 opacity-30 group-hover:opacity-100 transition-opacity">
                        <img
                            src="/awaken.svg"
                            alt="Awaken"
                            className="w-36 h-36 invert brightness-0 grayscale opacity-80"
                        />
                    </div>
                </div>
            </Card>

            {/* MegaETH - Blue/Purple Theme */}
            <Card className="p-6 bg-gradient-to-br from-blue-700 to-indigo-900 text-white border-0 relative overflow-hidden group cursor-pointer hover:scale-[1.02] transition-transform h-48">
                <div className="relative z-10">
                    <h3 className="text-xl font-bold mb-2">MegaETH</h3>
                    <p className="text-blue-100 text-sm mb-8 max-w-[70%]">
                        The First Real-Time Blockchain
                    </p>
                    {/* Logo: Large, Clipped */}
                    <div className="absolute -bottom-20 -right-20 opacity-40 rotate-12 group-hover:opacity-60 transition-opacity">
                        <img src="/assets/megaeth.svg" alt="MegaETH" className="w-56 h-56 invert brightness-0" />
                    </div>
                </div>
            </Card>


            {/* Keeta - Pink/Red Theme */}
            <Card className="p-6 bg-gradient-to-br from-pink-700 to-rose-900 text-white border-0 relative overflow-hidden group cursor-pointer hover:scale-[1.02] transition-transform h-48">
                <div className="relative z-10">
                    <h3 className="text-xl font-bold mb-2">Keeta</h3>
                    <p className="text-pink-100 text-sm mb-8 max-w-[70%]">
                        Designed for real-world payments and institutions
                    </p>
                    {/* Logo: Increased Size (w-64 h-64), Rotated Anti-Clockwise (-6deg), Adjusted Position */}
                    <div className="absolute -bottom-24 -right-8 opacity-40 group-hover:opacity-60 transition-opacity rotate-[-6deg]">
                        <img src="/assets/keeta.svg" alt="Keeta" className="w-64 h-64 invert brightness-0" />
                    </div>
                </div>
            </Card>
        </div>
    );
}
