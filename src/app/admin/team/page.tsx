"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import withRoleAuth from "@/components/admin/withRoleAuth";
import { Button } from "@/components/ui/button";
import {
    Plus,
    Search,
    Edit2,
    Trash2,
    Shield,
    Mail,
    User,
    Clock,
    Check,
    X,
    Loader2,
    MoreVertical
} from "lucide-react";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Types
type TeamUser = {
    id: string;
    full_name: string;
    email: string;
    role: string;
    status: string;
    created_at: string;
};

function TeamManagementPage() {
    const [users, setUsers] = useState<TeamUser[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<TeamUser[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState<string | null>(null);

    // Editing State
    const [editingUserId, setEditingUserId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<{
        full_name: string;
        role: string;
        status: string;
    }>({
        full_name: "",
        role: "",
        status: "",
    });

    useEffect(() => {
        fetchUsers();
    }, []);

    useEffect(() => {
        const filtered = users.filter((u) =>
            u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.role?.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setFilteredUsers(filtered);
    }, [searchQuery, users]);

    const fetchUsers = async () => {
        try {
            const response = await fetch("/api/admin/users");
            const data = await response.json();
            if (response.ok) {
                setUsers(data.users || []);
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error("Error fetching users:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleEditStart = (user: TeamUser) => {
        setEditingUserId(user.id);
        setEditForm({
            full_name: user.full_name || "",
            role: user.role || "coordinator",
            status: user.status || "active",
        });
    };

    const handleSaveEdit = async (userId: string) => {
        setIsSaving(userId);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            
            const response = await fetch("/api/admin/users", {
                method: "PATCH",
                headers: { 
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({
                    userId,
                    ...editForm
                }),
            });

            if (response.ok) {
                setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...editForm } : u));
                setEditingUserId(null);
            } else {
                const data = await response.json();
                throw new Error(data.error);
            }
        } catch (error: any) {
            alert("Failed to update user: " + error.message);
        } finally {
            setIsSaving(null);
        }
    };

    const handleDeleteUser = async (userId: string, name: string) => {
        if (!confirm(`Are you sure you want to delete user "${name}"? This action cannot be undone.`)) return;

        try {
            const response = await fetch(`/api/admin/users?userId=${userId}`, {
                method: "DELETE",
            });

            if (response.ok) {
                setUsers(prev => prev.filter(u => u.id !== userId));
            } else {
                const data = await response.json();
                throw new Error(data.error);
            }
        } catch (error: any) {
            alert("Failed to delete user: " + error.message);
        }
    };

    const getRoleColor = (role: string) => {
        switch (role.toLowerCase()) {
            case 'admin': return 'bg-purple-100 text-purple-700 border-purple-200';
            case 'hotel': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'coordinator': return 'bg-amber-100 text-amber-700 border-amber-200';
            default: return 'bg-zinc-100 text-zinc-700 border-zinc-200';
        }
    };

    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'active': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'inactive': return 'bg-red-100 text-red-700 border-red-200';
            case 'pending': return 'bg-blue-100 text-blue-700 border-blue-200';
            default: return 'bg-zinc-100 text-zinc-700 border-zinc-200';
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-black text-zinc-900 tracking-tight">Team Management</h2>
                    <p className="text-zinc-500 mt-1 font-medium italic">Manage system users, roles, and access levels.</p>
                </div>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-zinc-200 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-zinc-100">
                    <div className="relative group max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                        <Input
                            placeholder="Search by name, email, or role..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-12 bg-zinc-50 border-none rounded-2xl h-12 focus-visible:ring-2 focus-visible:ring-blue-500/20 transition-all font-medium"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="p-20 text-center flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-zinc-100 border-t-blue-600 rounded-full animate-spin" />
                        <span className="text-zinc-400 font-bold uppercase tracking-widest text-xs">Loading users...</span>
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div className="p-20 text-center">
                        <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-6 text-zinc-300">
                            <User size={40} />
                        </div>
                        <h4 className="text-xl font-black text-zinc-900">No users found</h4>
                        <p className="text-zinc-500 mt-2 font-medium">Try adjusting your search criteria.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-zinc-50/50 text-zinc-400 text-[10px] font-black uppercase tracking-[0.2em] border-b border-zinc-100">
                                    <th className="px-10 py-6">User Details</th>
                                    <th className="px-6 py-6 font-black">Role</th>
                                    <th className="px-6 py-6 font-black text-center">Status</th>
                                    <th className="px-6 py-6 font-black">Joined</th>
                                    <th className="px-10 py-6 text-right font-black">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100">
                                {filteredUsers.map((user) => {
                                    const isEditing = editingUserId === user.id;
                                    return (
                                        <tr key={user.id} className="group hover:bg-zinc-50/50 transition-colors">
                                            <td className="px-10 py-8">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-400 group-hover:bg-white group-hover:shadow-md transition-all border border-transparent group-hover:border-zinc-100 shrink-0 capitalize text-lg font-black">
                                                        {user.full_name?.[0] || <User size={20} />}
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        {isEditing ? (
                                                            <Input 
                                                                className="h-9 mb-1 font-bold text-zinc-900"
                                                                value={editForm.full_name}
                                                                onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                                                            />
                                                        ) : (
                                                            <span className="font-black text-zinc-900 truncate text-base">{user.full_name || 'N/A'}</span>
                                                        )}
                                                        <span className="text-xs font-bold text-zinc-400 flex items-center gap-1.5 mt-0.5">
                                                            <Mail size={12} className="opacity-70" />
                                                            {user.email}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-8">
                                                {isEditing ? (
                                                    <select 
                                                        className="h-9 px-3 rounded-xl bg-zinc-50 border-none text-sm font-bold focus:ring-2 focus:ring-blue-500/20"
                                                        value={editForm.role}
                                                        onChange={(e) => setEditForm({...editForm, role: e.target.value})}
                                                    >
                                                        <option value="admin">Admin</option>
                                                        <option value="hotel">Hotel</option>
                                                        <option value="coordinator">Coordinator</option>
                                                    </select>
                                                ) : (
                                                    <div className={cn("inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border", getRoleColor(user.role))}>
                                                        <Shield size={10} className="mr-1.5" />
                                                        {user.role}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-8 text-center">
                                                {isEditing ? (
                                                    <select 
                                                        className="h-9 px-3 rounded-xl bg-zinc-50 border-none text-sm font-bold focus:ring-2 focus:ring-blue-500/20 mx-auto"
                                                        value={editForm.status}
                                                        onChange={(e) => setEditForm({...editForm, status: e.target.value})}
                                                    >
                                                        <option value="active">Active</option>
                                                        <option value="inactive">Inactive</option>
                                                        <option value="pending">Pending</option>
                                                    </select>
                                                ) : (
                                                    <span className={cn("inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border", getStatusColor(user.status))}>
                                                        {user.status || 'Active'}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-8">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-black text-zinc-600">{format(new Date(user.created_at), "dd MMM yyyy")}</span>
                                                    <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-tight flex items-center gap-1 mt-0.5">
                                                        <Clock size={10} className="opacity-60" />
                                                        {format(new Date(user.created_at), "hh:mm a")}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-10 py-8 text-right">
                                                <div className="flex items-center justify-end gap-3">
                                                    {isEditing ? (
                                                        <>
                                                            <Button 
                                                                size="icon" 
                                                                className="h-10 w-10 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/20"
                                                                onClick={() => handleSaveEdit(user.id)}
                                                                disabled={isSaving === user.id}
                                                            >
                                                                {isSaving === user.id ? <Loader2 size={16} className="animate-spin" /> : <Check size={18} />}
                                                            </Button>
                                                            <Button 
                                                                size="icon" 
                                                                variant="ghost" 
                                                                className="h-10 w-10 rounded-xl text-zinc-400 hover:bg-zinc-100"
                                                                onClick={() => setEditingUserId(null)}
                                                            >
                                                                <X size={18} />
                                                            </Button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Button 
                                                                size="icon" 
                                                                variant="ghost"
                                                                className="h-10 w-10 rounded-xl text-zinc-300 hover:bg-blue-600 hover:text-white transition-all shadow-sm active:scale-95"
                                                                onClick={() => handleEditStart(user)}
                                                            >
                                                                <Edit2 size={18} />
                                                            </Button>
                                                            <Button 
                                                                size="icon" 
                                                                variant="ghost"
                                                                className="h-10 w-10 rounded-xl text-zinc-300 hover:bg-red-500 hover:text-white transition-all shadow-sm active:scale-95"
                                                                onClick={() => handleDeleteUser(user.id, user.full_name)}
                                                            >
                                                                <Trash2 size={18} />
                                                            </Button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

export default withRoleAuth(TeamManagementPage, 'admin');
