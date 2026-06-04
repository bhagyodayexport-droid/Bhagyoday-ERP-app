import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { Quotation, UserProfile } from '../types';
import { TrendingUp, Users, ShoppingBag, IndianRupee, ArrowUpRight, ArrowDownRight, Clock, CheckCircle2, BarChart3, PieChart as PieChartIcon, Target } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl shadow-2xl">
        <p className="text-[10px] font-black uppercase text-slate-500 mb-2 tracking-widest">Day: {label}</p>
        <div className="space-y-1">
          <p className="text-xs font-black text-white flex justify-between gap-8">
            Revenue: <span className="text-blue-400">₹{payload[0].value.toLocaleString()}</span>
          </p>
          <p className="text-xs font-black text-white flex justify-between gap-8">
            Profit: <span className="text-emerald-400">₹{payload[1].value.toLocaleString()}</span>
          </p>
        </div>
      </div>
    );
  }
  return null;
};

const MaterialStatRow = React.memo(({ name, stat, index }: { name: string, stat: any, index: number }) => (
  <div className="p-5 bg-white border border-slate-100 rounded-2xl hover:border-slate-300 hover:shadow-md transition-all flex items-center justify-between group">
     <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center font-black text-xs text-slate-500 group-hover:bg-slate-900 group-hover:text-white transition-colors uppercase italic">
           {name.charAt(0)}
        </div>
        <div>
           <p className="text-xs font-black text-slate-900 uppercase truncate max-w-[120px] sm:max-w-none">{name}</p>
           <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Invoiced: {stat.count}</p>
        </div>
     </div>
     <div className="text-right">
        <p className="text-sm font-black text-slate-900 leading-none mb-1.5">₹{Math.round(stat.revenue).toLocaleString()}</p>
        <div className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full inline-block uppercase tracking-widest">₹{Math.round(stat.profit).toLocaleString()} Profit</div>
     </div>
  </div>
));

const CustomerStatCard = React.memo(({ name, stat, totalProfit }: { name: string, stat: any, totalProfit: number }) => (
  <div className="p-6 bg-white rounded-2xl border border-slate-100 hover:border-blue-200 transition-all group relative shadow-sm">
     <div className="flex justify-between items-start mb-4">
        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 font-black text-sm">
           {name.charAt(0)}
        </div>
        <div className="text-[9px] font-black text-slate-500 bg-slate-50 px-2 py-1 rounded-full uppercase tracking-widest">
           {stat.count} Quotes
        </div>
     </div>
     <h3 className="text-xs font-black text-slate-900 uppercase mb-2 truncate max-w-full">{name}</h3>
     <div className="flex justify-between items-end mt-4">
        <div>
           <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Profit Contribution</p>
           <p className="text-lg font-black text-slate-900">₹{Math.round(stat.profit).toLocaleString()}</p>
        </div>
        <div className="text-right pb-0.5">
           <div className="text-xs font-black text-blue-500">{totalProfit > 0 ? ((stat.profit / totalProfit) * 100).toFixed(1) : 0}%</div>
        </div>
     </div>
  </div>
));

const EmployeeIntelligenceRow = React.memo(({ emp }: { emp: any }) => (
  <tr className="hover:bg-slate-50 transition-colors group">
      <td className="px-6 py-5">
         <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-9 h-9 bg-slate-900 rounded-xl flex items-center justify-center text-white font-black text-xs">
                 {emp.email.charAt(0).toUpperCase()}
              </div>
              {emp.isOnline && <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>}
            </div>
            <div>
               <p className="text-xs font-black text-slate-900 uppercase tracking-tight">{emp.email.split('@')[0]}</p>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{emp.role}</p>
            </div>
         </div>
      </td>
      <td className="px-6 py-5 text-center">
         <span className="text-xs font-black text-slate-900" title="Total">{emp.stats.total}</span>
         <span className="text-[10px] font-bold text-green-600" title="Success"> / {emp.stats.approved}</span>
         <span className="text-[10px] font-bold text-amber-600" title="Negotiations"> / {emp.stats.negotiations}</span>
      </td>
    <td className="px-6 py-5">
       <div className="max-w-[100px] mx-auto space-y-1 text-center">
          <span className="text-[10px] font-black text-blue-600">{emp.stats.conversion.toFixed(1)}%</span>
          <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
             <div 
               className="h-full bg-blue-600 transition-all duration-500" 
               style={{ width: `${emp.stats.conversion}%` }}
             ></div>
          </div>
       </div>
    </td>
    <td className="px-6 py-5 text-center font-black text-slate-900 text-sm">₹{Math.round(emp.stats.revenue/1000)}k</td>
    <td className="px-6 py-5 text-right font-bold text-slate-400 text-[10px] uppercase tracking-tighter shrink-0">
       {emp.lastSeen ? new Date(emp.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '---'}
    </td>
 </tr>
));

export const SalesAnalytics: React.FC = () => {
  const { profile } = useAuth();
  const [data, setData] = useState<Quotation[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

  useEffect(() => {
    const q = query(collection(db, 'quotations'), orderBy('createdAt', 'desc'));
    const unsubQuotes = onSnapshot(q, (snap) => {
      setData(snap.docs.map(d => ({ ...d.data(), id: d.id } as Quotation)));
      setLoading(false);
    });

    const uQuery = query(collection(db, 'users'), orderBy('lastSeen', 'desc'));
    const unsubUsers = onSnapshot(uQuery, (snap) => {
      setUsers(snap.docs.map(d => d.data() as UserProfile));
    });

    return () => {
      unsubQuotes();
      unsubUsers();
    };
  }, []);

  const {
    totalRev,
    totalProfit,
    avgMargin,
    topMaterials,
    topCustomers,
    employeeIntelligence,
    productStats,
    filteredData,
    chartData
  } = React.useMemo(() => {
    const filtered = data.filter(q => 
      q.rawDate.startsWith(selectedMonth) && 
      (q.status === 'Material Dispatched' || q.status === 'Approved' || q.status === 'Closed')
    );
    
    const rev = filtered.reduce((acc, q) => acc + Number((q.grandTotal || 0).toString().replace(/,/g, '')), 0);
    const profit = filtered.reduce((acc, q) => {
      let qProfit = 0;
      q.items.forEach(item => {
        if (item.costPrice && item.costPrice > 0) {
          const rate = item.convertedRate || item.rate || 0;
          qProfit += (rate - item.costPrice) * (item.qty || 0);
        }
      });
      return acc + qProfit;
    }, 0);
    
    const margin = rev > 0 ? (profit / rev) * 100 : 0;

    const mStats: Record<string, any> = {};
    const pStats: Record<string, any> = {};
    const cStats: Record<string, any> = {};
    const dailyStats: Record<string, { date: string, revenue: number, profit: number }> = {};

    filtered.forEach(q => {
      // Daily Stats for Chart
      const date = q.rawDate;
      if (!dailyStats[date]) dailyStats[date] = { date, revenue: 0, profit: 0 };
      dailyStats[date].revenue += Number((q.grandTotal || 0).toString().replace(/,/g, ''));
      
      let qp = 0;
      q.items.forEach(item => {
        if (item.costPrice) {
          qp += ((item.convertedRate || item.rate) - item.costPrice) * (item.qty || 0);
        }
      });
      dailyStats[date].profit += qp;

      // Customer Stats
      if (!cStats[q.custName]) cStats[q.custName] = { revenue: 0, profit: 0, count: 0 };
      cStats[q.custName].revenue += Number((q.grandTotal || 0).toString().replace(/,/g, ''));
      cStats[q.custName].profit += qp;
      cStats[q.custName].count += 1;

      q.items.forEach(item => {
        // Material Stats
        const mKey = `${item.make || 'Generic'} - ${item.colour || ''}`;
        if (!mStats[mKey]) mStats[mKey] = { qty: 0, revenue: 0, profit: 0, count: 0 };
        mStats[mKey].qty += Number(item.qty) || 0;
        mStats[mKey].revenue += Number(item.total) || 0;
        mStats[mKey].count += 1;
        if (item.costPrice) {
           mStats[mKey].profit += ((item.convertedRate || item.rate) - item.costPrice) * item.qty;
        }

        // Product Summary Stats
        if (!pStats[item.name]) pStats[item.name] = { qty: 0, length: 0, revenue: 0, profit: 0, count: 0 };
        pStats[item.name].qty += Number(item.qty) || 0;
        pStats[item.name].length += (Number(item.len) || 0) * (Number(item.pcs) || 0);
        pStats[item.name].revenue += Number(item.total) || 0;
        if (item.costPrice) {
           pStats[item.name].profit += ((item.convertedRate || item.rate) - item.costPrice) * item.qty;
        }
        pStats[item.name].count += 1;
      });
    });

    const intel = users.map(user => {
      const userQuotes = filtered.filter(q => q.createdBy === user.uid);
      const approved = userQuotes.filter(q => q.status === 'Approved' || q.status === 'Material Dispatched').length;
      const negotiations = userQuotes.filter(q => q.status === 'Negotiation').length;
      const revenue = userQuotes.reduce((acc, q) => acc + Number((q.grandTotal || 0).toString().replace(/,/g, '')), 0);
      const isOnline = user.lastSeen ? (Date.now() - new Date(user.lastSeen).getTime() < 300000) : false;

      return { ...user, stats: { total: userQuotes.length, approved, negotiations, revenue, conversion: userQuotes.length > 0 ? (approved / userQuotes.length) * 100 : 0 }, isOnline };
    });

    const cData = Object.values(dailyStats).sort((a,b) => a.date.localeCompare(b.date)).map(d => ({
      ...d,
      displayDate: new Date(d.date).getDate()
    }));

    return {
      totalRev: rev,
      totalProfit: profit,
      avgMargin: margin,
      topMaterials: Object.entries(mStats).sort((a,b) => b[1].profit - a[1].profit).slice(0, 5),
      topCustomers: Object.entries(cStats).sort((a,b) => b[1].profit - a[1].profit).slice(0, 5),
      employeeIntelligence: intel,
      productStats: pStats,
      filteredData: filtered,
      chartData: cData
    };
  }, [data, users, selectedMonth]);

  const statsCards = [
    { label: 'Dispatched Revenue', value: `₹${Math.round(totalRev).toLocaleString()}`, icon: ShoppingBag, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
    { label: 'Total Profit (₹)', value: `₹${Math.round(totalProfit).toLocaleString()}`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
    { label: 'Average Margin (%)', value: `${avgMargin.toFixed(1)}%`, icon: Target, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100' },
  ];

  if (loading) return <div className="p-12 text-center text-[10px] font-black tracking-widest uppercase text-slate-400">Syncing Intelligence...</div>;

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-8 space-y-10 bg-slate-50/50 min-h-screen">
      {/* Financial Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
         <div>
            <div className="flex items-center gap-3 mb-1">
               <div className="bg-slate-900 p-2 rounded-lg text-white">
                 <BarChart3 size={20} />
               </div>
               <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Business Tracker</h2>
            </div>
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest pl-11">Profit & Revenue Analysis</p>
         </div>
         <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm w-full md:w-auto">
            <Clock size={16} className="text-slate-400 ml-2" />
            <input 
              type="month" 
              className="h-10 px-4 bg-transparent border-none rounded-xl text-xs font-black uppercase tracking-widest cursor-pointer focus:ring-0 outline-none w-full md:w-44"
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
            />
         </div>
      </div>

      {/* Top 3 Big Numbers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {statsCards.map((s) => (
          <div key={s.label} className={cn(
            "p-8 rounded-3xl border bg-white shadow-xl shadow-slate-200/40 relative overflow-hidden group transition-all hover:scale-[1.02]",
            s.border
          )}>
             <div className={cn("absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 rounded-full opacity-20 transition-transform group-hover:scale-150 duration-700", s.bg)}></div>
             
             <div className="flex items-center gap-3 mb-6">
                <div className={cn("p-2.5 rounded-xl", s.bg, s.color)}>
                  <s.icon size={18} />
                </div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.label}</span>
             </div>
             
             <div className="relative">
                <h3 className="text-3xl font-black text-slate-900 tracking-tight">{s.value}</h3>
                <div className="flex items-center gap-1.5 mt-2 text-[9px] font-black uppercase text-slate-400 tracking-widest">
                   <CheckCircle2 size={10} className="text-green-500" /> Confirmed Value
                </div>
             </div>
          </div>
        ))}
      </div>

      {/* Chart: Sales vs Profit */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/40">
         <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
            <div>
               <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Dispatched Sales Performance</h3>
               <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-1">Daily growth for {selectedMonth}</p>
            </div>
            <div className="flex gap-4">
               <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-[9px] font-black text-slate-600 uppercase">Revenue</span>
               </div>
               <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full border-2 border-emerald-500"></div>
                  <span className="text-[9px] font-black text-slate-600 uppercase">Profit</span>
               </div>
            </div>
         </div>
         
         <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
               <AreaChart data={chartData}>
                  <defs>
                     <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                     </linearGradient>
                     <linearGradient id="colorProf" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                     </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="displayDate" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 9, fontWeight: 900, fill: '#64748b' }}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 9, fontWeight: 900, fill: '#64748b' }}
                    tickFormatter={(v) => `₹${v/1000}k`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                  <Area type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorProf)" />
               </AreaChart>
            </ResponsiveContainer>
         </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
         {/* Top Products - Profit Based */}
         <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between">
               <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                 🏆 Top Profit Products
               </h2>
               <TrendingUp size={14} className="text-emerald-500" />
            </div>
            <div className="p-4 space-y-3">
               {Object.entries(productStats).sort((a,b) => b[1].profit - a[1].profit).slice(0, 5).map(([name, stat], i) => (
                  <div key={name} className="p-5 bg-slate-50/50 rounded-2xl border border-transparent hover:border-slate-200 hover:bg-white transition-all flex items-center justify-between group">
                     <div className="flex items-center gap-4">
                        <div className="w-8 h-8 bg-white border border-slate-200 rounded-xl flex items-center justify-center font-black text-xs text-slate-400">#{i+1}</div>
                        <div>
                           <p className="text-xs font-black text-slate-900 uppercase truncate max-w-[150px]">{name}</p>
                           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{stat.qty.toFixed(0)} SOLD</p>
                        </div>
                     </div>
                     <div className="text-right">
                        <p className="text-sm font-black text-slate-900 mb-0.5">₹{Math.round(stat.profit).toLocaleString()}</p>
                        <div className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">NET PROFIT</div>
                     </div>
                  </div>
               ))}
            </div>
         </div>

         {/* Top Materials & Items */}
         <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between">
               <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                 💎 Top Materials
               </h2>
               <PieChartIcon size={14} className="text-blue-500" />
            </div>
            <div className="p-4 space-y-3">
               {topMaterials.slice(0, 5).map(([name, stat], i) => (
                  <MaterialStatRow key={name} name={name} stat={stat} index={i} />
               ))}
            </div>
         </div>

         {/* Best Customers */}
         <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between">
               <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                 👑 Top Client Profit
               </h2>
               <Users size={14} className="text-purple-500" />
            </div>
            <div className="p-4 space-y-3">
               {topCustomers.slice(0, 5).map(([name, stat]) => (
                  <CustomerStatCard key={name} name={name} stat={stat} totalProfit={totalProfit} />
               ))}
            </div>
         </div>
      </div>

      {/* Full Product Breakdown */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-xl shadow-slate-200/40">
         <div className="p-8 border-b border-slate-100 flex justify-between items-center">
            <div>
               <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">Monthly Performance Audit</h2>
               <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Full Dispatch Breakdown</p>
            </div>
            <div className="text-[10px] font-black text-slate-400 bg-slate-50 px-3 py-1 rounded-full uppercase tracking-widest">
               {selectedMonth} Breakdown
            </div>
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
               <thead>
                  <tr className="bg-slate-50/50 text-[10px] font-black uppercase tracking-widest text-slate-500">
                     <th className="px-8 py-5">Product Details</th>
                     <th className="px-6 py-5 text-center">Volume Sold</th>
                     <th className="px-6 py-5 text-center">Gross Revenue</th>
                     <th className="px-6 py-5 text-center">Estimated Cost</th>
                     <th className="px-8 py-5 text-right text-emerald-600">Net Profit (₹)</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                  {Object.entries(productStats).sort((a,b) => b[1].profit - a[1].profit).map(([name, stat]) => (
                     <tr key={name} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-8 py-5">
                           <p className="text-xs font-black text-slate-900 uppercase tracking-tight">{name}</p>
                           <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{stat.count} Orders</p>
                        </td>
                        <td className="px-6 py-5 text-center">
                           <span className="text-xs font-black text-slate-700">{stat.qty.toFixed(1)}</span>
                           <span className="text-[9px] font-bold text-slate-400 ml-1">UNITS</span>
                        </td>
                        <td className="px-6 py-5 text-center font-bold text-slate-600 text-xs">₹{stat.revenue.toLocaleString()}</td>
                        <td className="px-6 py-5 text-center font-bold text-slate-400 text-xs">₹{(stat.revenue - stat.profit).toLocaleString()}</td>
                        <td className="px-8 py-5 text-right font-black text-slate-900">
                           <span className="text-emerald-600">₹{stat.profit.toLocaleString()}</span>
                        </td>
                     </tr>
                  ))}
               </tbody>
               <tfoot>
                  <tr className="bg-slate-950 text-white">
                     <td className="px-8 py-5 font-black uppercase tracking-widest text-[10px]">Grand Total Performance</td>
                     <td className="px-6 py-5"></td>
                     <td className="px-6 py-5 text-center font-black text-xs text-blue-400">₹{totalRev.toLocaleString()}</td>
                     <td className="px-6 py-5 text-center font-black text-xs text-slate-400">₹{(totalRev - totalProfit).toLocaleString()}</td>
                     <td className="px-8 py-5 text-right font-black text-emerald-400 text-sm">₹{totalProfit.toLocaleString()}</td>
                  </tr>
               </tfoot>
            </table>
         </div>
      </div>
    </div>
  );
};

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
