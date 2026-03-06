"use client";

import { useState } from "react"; 
import { toggleUserRole, deleteUser, getAllUsers } from "@/actions/admin.actions"; 
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Trash2, ShieldAlert, ShieldCheck, Loader2, Crown, UserCircle, Search, ChevronDown } from "lucide-react"; 

export default function UserManagementTable({ initialUsers }) {
  const [users, setUsers] = useState(initialUsers);
  const [searchTerm, setSearchTerm] = useState(""); 
  const [loadingId, setLoadingId] = useState(null);
  
  // 🚀 REAL PAGINATION STATE
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initialUsers.length === 20); 

  const { toast } = useToast();

  const handleToggleRole = async (userId) => {
    setLoadingId(userId);
    // 🚀 THE FIX: Only send userId. Server calculates the new role safely.
    const res = await toggleUserRole(userId); 
    if (res.success) {
      // 🚀 THE FIX: Update local state to match the new server state
      setUsers(users.map(u => u._id === userId ? { ...u, role: res.newRole } : u));
      toast({ title: "Authority Updated", description: `User is now a ${res.newRole === 'admin' ? 'Admin' : 'User'}.` });
    } else {
      toast({ title: "Update Failed", description: res.error, variant: "destructive" });
    }
    setLoadingId(null);
  };

  const handleDelete = async (userId) => {
    if (!confirm("CRITICAL ACTION: Are you sure? This will wipe the user's profile and delete all associated assets (avatars).")) return;
    setLoadingId(userId);
    const res = await deleteUser(userId);
    if (res.success) {
      setUsers(users.filter(u => u._id !== userId));
      toast({ title: "User Deleted", variant: "destructive" });
    } else {
      toast({ title: "Error", description: res.error, variant: "destructive" });
    }
    setLoadingId(null);
  };

  // 🚀 REAL DB FETCH FOR LOAD MORE
  const handleLoadMore = async () => {
    setLoadingMore(true);
    const nextPage = page + 1;
    const res = await getAllUsers(nextPage, 20);
    
    if (res?.users?.length > 0) {
      setUsers((prev) => [...prev, ...res.users]);
      setPage(nextPage);
      if (res.users.length < 20) setHasMore(false); // No more pages left
    } else {
      setHasMore(false);
    }
    setLoadingMore(false);
  };

  // INSTANT SEARCH ENGINE (Filters currently loaded data)
  const filteredUsers = users.filter(user => 
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="border border-white/10 rounded-3xl overflow-hidden bg-card/50 backdrop-blur-sm shadow-xl">
      
      {/* 🚀 SEARCH & UTILITY BAR */}
      <div className="p-4 sm:p-5 border-b border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white/[0.01]">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input 
            placeholder="Search loaded users..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-10 bg-black/40 border-white/10 text-sm focus-visible:ring-blue-500 text-white placeholder:text-gray-600 rounded-xl"
          />
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20 px-3 py-1.5 h-auto text-xs font-bold uppercase tracking-widest">
            {filteredUsers.length} Loaded
          </Badge>
        </div>
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left min-w-[700px]">
          <thead className="bg-white/[0.02] text-white/40 uppercase text-[10px] font-black tracking-[0.2em] border-b border-white/5">
            <tr>
              <th className="px-8 py-5">Identity</th>
              <th className="px-6 py-5">Clearance Level</th>
              <th className="px-6 py-5 hidden sm:table-cell text-center">Contribution</th>
              <th className="px-8 py-5 text-right">Administrative</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredUsers.map((user) => {
              const isMainAdmin = user.email === process.env.NEXT_PUBLIC_MAIN_ADMIN_EMAIL;

              return (
                <tr key={user._id} className={`transition-all group ${isMainAdmin ? 'bg-yellow-500/[0.02]' : 'hover:bg-white/[0.03]'}`}>
                  
                  {/* 1. Profile Identity */}
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <Avatar className={`h-11 w-11 border-2 transition-transform group-hover:scale-105 ${isMainAdmin ? 'border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.2)]' : 'border-white/10 shadow-lg'}`}>
                          <AvatarImage src={user.avatar} referrerPolicy="no-referrer" />
                          <AvatarFallback className="bg-secondary text-blue-400 font-black">{user.name?.charAt(0) || "?"}</AvatarFallback>
                        </Avatar>
                        {isMainAdmin && (
                            <div className="absolute -top-1 -right-1 bg-yellow-500 rounded-full p-0.5 shadow-lg">
                                <Crown className="w-3 h-3 text-black" />
                            </div>
                        )}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-white text-base truncate max-w-[180px] lg:max-w-[250px] group-hover:text-blue-400 transition-colors">
                            {user.name}
                        </span>
                        <span className="text-[10px] text-white/40 font-mono truncate max-w-[180px] lg:max-w-[250px]">
                          {user.email}
                        </span>
                      </div>
                    </div>
                  </td>
                  
                  {/* 2. Authority Level */}
                  <td className="px-6 py-4">
                    {isMainAdmin ? (
                         <Badge className="bg-yellow-500 text-black border-none font-black text-[9px] tracking-[0.1em] px-3 py-1">
                            ROOT ADMIN
                         </Badge>
                    ) : (
                        <Badge variant="outline" className={`font-black text-[9px] tracking-[0.1em] px-3 py-1 uppercase border-2 ${user.role === 'admin' ? "border-purple-500/50 text-purple-400 bg-purple-500/5" : "border-cyan-500/50 text-cyan-400 bg-cyan-500/5"}`}>
                          {user.role}
                        </Badge>
                    )}
                  </td>
                  
                  {/* 3. Contribution Stats */}
                  <td className="px-6 py-4 hidden sm:table-cell">
                    <div className="flex flex-col items-center gap-1">
                       <span className="text-xs font-black text-white/80 group-hover:text-cyan-400 transition-colors">
                         {user.exactNoteCount || user.noteCount || 0} <span className="text-[9px] text-white/30 tracking-widest uppercase ml-1">Notes</span>
                       </span>
                       <span className="text-xs font-black text-white/80 group-hover:text-purple-400 transition-colors">
                         {user.exactBlogCount || user.blogCount || 0} <span className="text-[9px] text-white/30 tracking-widest uppercase ml-1">Blogs</span>
                       </span>
                    </div>
                  </td>
                  
                  {/* 4. Administrative Actions */}
                  <td className="px-8 py-5 text-right space-x-3 whitespace-nowrap">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className={`h-9 px-4 rounded-xl font-bold uppercase text-[10px] tracking-widest transition-all ${user.role === 'admin' ? 'hover:bg-red-500/10 hover:text-red-400 text-white/40' : 'hover:bg-cyan-500/10 hover:text-cyan-400 text-white/40'}`}
                      onClick={() => handleToggleRole(user._id)} // 🚀 Pass only ID
                      disabled={loadingId === user._id || isMainAdmin}
                    >
                      {loadingId === user._id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin"/>
                      ) : user.role === 'admin' ? (
                        <><ShieldAlert className="w-3.5 h-3.5 mr-2"/> Demote</>
                      ) : (
                        <><ShieldCheck className="w-3.5 h-3.5 mr-2"/> Promote</>
                      )}
                    </Button>

                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-9 w-9 rounded-xl text-red-500/40 hover:text-red-500 hover:bg-red-500/10 transition-all"
                      onClick={() => handleDelete(user._id)}
                      disabled={loadingId === user._id || isMainAdmin}
                    >
                      {loadingId === user._id ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Trash2 className="w-3.5 h-3.5" />}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 🚀 TRUE BACKEND LOAD MORE BUTTON */}
      {hasMore && !searchTerm && (
        <div className="p-4 flex justify-center border-t border-white/5 bg-white/[0.01]">
          <Button 
            variant="outline" 
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="rounded-full border-white/10 text-gray-300 hover:text-white hover:bg-white/5 font-bold uppercase tracking-widest text-[10px] h-10 px-6 transition-all"
          >
            {loadingMore ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin"/> Loading...</>
            ) : (
                <>Load More Users <ChevronDown className="w-4 h-4 ml-2" /></>
            )}
          </Button>
        </div>
      )}

      {filteredUsers.length === 0 && (
        <div className="py-24 flex flex-col items-center justify-center text-white/20 bg-black/20">
            <UserCircle size={48} className="mb-4 opacity-10" />
            <p className="font-bold uppercase tracking-[0.3em] text-[10px]">
              {searchTerm ? "No users found" : "No users registered in system"}
            </p>
            {searchTerm && (
              <Button variant="link" onClick={() => setSearchTerm("")} className="mt-2 text-blue-400">
                Clear Search
              </Button>
            )}
        </div>
      )}
    </div>
  );
}