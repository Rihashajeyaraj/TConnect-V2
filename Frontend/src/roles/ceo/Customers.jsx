import { useState, useEffect } from 'react'
import { Users, Search, Download, Plus, Mail, Phone, MapPin } from 'lucide-react'

const initialCustomers = [
  { id: '1', name: 'ABC Pvt Ltd', contact: 'John Doe', email: 'john@abcpvt.com', phone: '+91 98765 43210', location: 'Chennai', value: '₹1,20,000', color: 'bg-blue-500' },
  { id: '2', name: 'Tech Solutions', contact: 'Mary Jane', email: 'mary@techsolutions.com', phone: '+91 87654 32109', location: 'Bangalore', value: '₹85,000', color: 'bg-emerald-500' },
  { id: '3', name: 'Global Corp', contact: 'Robert Smith', email: 'robert@globalcorp.com', phone: '+91 76543 21098', location: 'Mumbai', value: '₹4,50,000', color: 'bg-purple-500' },
  { id: '4', name: 'Prime Systems', contact: 'David Brown', email: 'david@primesystems.com', phone: '+91 65432 10987', location: 'Hyderabad', value: '₹65,000', color: 'bg-orange-500' },
  { id: '5', name: 'Vertex Systems', contact: 'David Brown', email: 'david@vertex.com', phone: '+91 21098 76543', location: 'Delhi', value: '₹95,000', color: 'bg-indigo-500' },
]

function Customers() {
  const [customers, setCustomers] = useState(() => {
    const saved = localStorage.getItem('tc_customers')
    if (saved) {
      const data = JSON.parse(saved)
      const migrated = data.map(c => {
        if (typeof c.value === 'string' && c.value.startsWith('$')) {
          // Convert $120k -> ₹1,20,000
          const numeric = c.value.replace('$', '').replace('k', '')
          const numValue = parseFloat(numeric)
          return { ...c, value: `₹${(numValue * 1000).toLocaleString('en-IN')}` }
        }
        return c
      })
      localStorage.setItem('tc_customers', JSON.stringify(migrated))
      return migrated
    }
    localStorage.setItem('tc_customers', JSON.stringify(initialCustomers))
    return initialCustomers
  })

  useEffect(() => {
    const handleUpdate = () => {
      const saved = localStorage.getItem('tc_customers')
      if (saved) {
        const data = JSON.parse(saved)
        const migrated = data.map(c => {
          if (typeof c.value === 'string' && c.value.startsWith('$')) {
            const numeric = c.value.replace('$', '').replace('k', '')
            const numValue = parseFloat(numeric)
            return { ...c, value: `₹${(numValue * 1000).toLocaleString('en-IN')}` }
          }
          return c
        })
        setCustomers(migrated)
      }
    }
    window.addEventListener('tc_state_update', handleUpdate)
    return () => window.removeEventListener('tc_state_update', handleUpdate)
  }, [])

  const [search, setSearch] = useState('')
  const filtered = customers.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.contact.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Customer Database</h2>
          <p className="mt-1 text-xs font-semibold text-slate-400">Home &gt; Customers</p>
        </div>
        <button className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#A8C2FF] to-[#3B82F6] px-5 py-2.5 text-sm font-bold text-black border border-[#2563EB]/40 shadow-[0_8px_20px_-3px_rgba(59,130,246,0.3),inset_0_1.5px_0_rgba(255,255,255,0.45)] hover:from-[#95B6FF] hover:to-[#2563EB] hover:shadow-[0_12px_24px_-3px_rgba(59,130,246,0.4),inset_0_1.5px_0_rgba(255,255,255,0.5)] transition-all duration-300 active:scale-[0.98]">
          <Plus className="size-4" /> Add Customer
        </button>
      </div>

      <div className="flex items-center gap-4 bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search customers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full border-collapse text-left text-sm text-slate-600">
          <thead className="bg-slate-50 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
            <tr>
              <th className="px-6 py-4">Company Name</th>
              <th className="px-6 py-4">Primary Contact</th>
              <th className="px-6 py-4">Email</th>
              <th className="px-6 py-4">Phone</th>
              <th className="px-6 py-4">Location</th>
              <th className="px-6 py-4 text-right">LTV Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-semibold">
            {filtered.map((c, idx) => (
              <tr key={idx} className="hover:bg-slate-50/50 transition">
                <td className="px-6 py-4 text-slate-900 font-bold">{c.name}</td>
                <td className="px-6 py-4">{c.contact}</td>
                <td className="px-6 py-4 flex items-center gap-1.5"><Mail className="size-3.5 text-slate-400" />{c.email}</td>
                <td className="px-6 py-4"><span className="inline-flex items-center gap-1.5"><Phone className="size-3.5 text-slate-400" />{c.phone}</span></td>
                <td className="px-6 py-4 flex items-center gap-1.5"><MapPin className="size-3.5 text-slate-400" />{c.location}</td>
                <td className="px-6 py-4 text-right text-emerald-600 font-bold">{c.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default Customers
