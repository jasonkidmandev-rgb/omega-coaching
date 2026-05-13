import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Loader2, Shield, ShieldOff, Users, Bell, BellOff, UserPlus, UserCheck, Eye, DollarSign, Plus, Mail, Clock, RefreshCw, X, KeyRound, Link2, Unlink } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { format } from "date-fns";
import { useRef, useEffect, useState } from "react";

export default function AdminTeam() {
  const [, setLocation] = useLocation();
  const { user: currentUser } = useAuth();
  const { data: users, isLoading, refetch } = trpc.users.list.useQuery();
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [isAddAdminOpen, setIsAddAdminOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminName, setNewAdminName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "manager" | "viewer" | "finance">("viewer");
  
  // Check which users already have client protocols
  const userEmails = users?.map(u => u.email).filter((e): e is string => !!e) || [];
  const { data: clientProtocols } = trpc.clientProtocol.list.useQuery({ filter: 'active' });

  // Scroll position preservation
  const savedScrollPosition = useRef<number | null>(null);
  const shouldRestoreScroll = useRef(false);

  useEffect(() => {
    if (shouldRestoreScroll.current && savedScrollPosition.current !== null) {
      requestAnimationFrame(() => {
        window.scrollTo(0, savedScrollPosition.current!);
        savedScrollPosition.current = null;
        shouldRestoreScroll.current = false;
      });
    }
  });

  const saveScrollPosition = () => {
    savedScrollPosition.current = window.scrollY;
    shouldRestoreScroll.current = true;
  };

  const updateRoleMutation = trpc.users.updateRole.useMutation({
    onSuccess: () => {
      toast.success("User role updated");
      saveScrollPosition();
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const adminResetPasswordMutation = trpc.users.adminResetPassword.useMutation({
    onSuccess: (data) => {
      toast.success(`Password reset email sent to ${data.email}`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to send reset email");
    },
  });

  const updateNotificationMutation = trpc.users.updateNotificationPreference.useMutation({
    onSuccess: () => {
      toast.success("Notification preference updated");
      saveScrollPosition();
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateNotificationEmailMutation = trpc.users.updateNotificationEmail.useMutation({
    onSuccess: () => {
      toast.success("Notification email updated");
      saveScrollPosition();
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const [editingEmailUserId, setEditingEmailUserId] = useState<number | null>(null);
  const [editingEmailValue, setEditingEmailValue] = useState("");
  const [linkingUserId, setLinkingUserId] = useState<number | null>(null);
  const [selectedTeamMemberId, setSelectedTeamMemberId] = useState<string>("");

  // Team member data for linking
  const { data: teamMembersList, refetch: refetchTeamMembers } = trpc.teamMember.list.useQuery();

  const linkUserMutation = trpc.teamMember.linkUser.useMutation({
    onSuccess: () => {
      toast.success("User account linked to team member profile");
      setLinkingUserId(null);
      setSelectedTeamMemberId("");
      saveScrollPosition();
      refetchTeamMembers();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to link user");
    },
  });

  const unlinkUserMutation = trpc.teamMember.unlinkUser.useMutation({
    onSuccess: () => {
      toast.success("User account unlinked from team member profile");
      saveScrollPosition();
      refetchTeamMembers();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to unlink user");
    },
  });

  // Helper to find which team member a user is linked to
  const getLinkedTeamMember = (userId: number) => {
    return teamMembersList?.find((tm: any) => tm.userId === userId);
  };

  // Helper to get unlinked team members for the dropdown
  const getUnlinkedTeamMembers = (currentUserId: number) => {
    return teamMembersList?.filter((tm: any) => !tm.userId || tm.userId === currentUserId) || [];
  };

  const handleRoleChange = (userId: number, newRole: string) => {
    if (userId === currentUser?.id) {
      toast.error("You cannot change your own role");
      return;
    }
    updateRoleMutation.mutate({ userId, role: newRole as any });
  };

  const handleNotificationToggle = (userId: number, receiveNotifications: boolean) => {
    updateNotificationMutation.mutate({ userId, receiveNotifications });
  };

  // Pending invitations
  const { data: pendingInvitations, refetch: refetchInvitations } = trpc.invitation.getPending.useQuery();
  
  const sendInviteMutation = trpc.invitation.send.useMutation({
    onSuccess: () => {
      toast.success("Invitation sent successfully!");
      setIsInviteOpen(false);
      setInviteEmail("");
      setInviteName("");
      setInviteRole("viewer");
      refetchInvitations();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to send invitation");
    },
  });
  
  const revokeInvitationMutation = trpc.invitation.revoke.useMutation({
    onSuccess: () => {
      toast.success("Invitation revoked");
      refetchInvitations();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to revoke invitation");
    },
  });
  
  const handleResendInvite = (email: string, name: string | null, role: string) => {
    sendInviteMutation.mutate({
      email,
      name: name || undefined,
      role: role as any,
    });
  };
  
  const handleRevokeInvite = (id: number) => {
    revokeInvitationMutation.mutate({ id });
  };
  
  const getTimeRemaining = (expiresAt: Date) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();
    if (diff <= 0) return "Expired";
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days > 0) return `${days}d ${hours}h remaining`;
    return `${hours}h remaining`;
  };

  const handleAddAdmin = () => {
    if (!newAdminEmail.trim()) {
      toast.error("Please enter an email address");
      return;
    }
    
    // Check if user exists
    const existingUser = users?.find(u => u.email?.toLowerCase() === newAdminEmail.toLowerCase());
    if (!existingUser) {
      toast.error("User not found. Please share the app URL with them first.");
      return;
    }
    
    // Promote to admin
    handleRoleChange(existingUser.id, "admin");
    setIsAddAdminOpen(false);
    setNewAdminEmail("");
    setNewAdminName("");
  };

  const handleSendInvite = () => {
    if (!inviteEmail.trim()) {
      toast.error("Please enter an email address");
      return;
    }
    sendInviteMutation.mutate({
      email: inviteEmail,
      name: inviteName || undefined,
      role: inviteRole,
    });
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  // Sort users by role priority
  const roleOrder: Record<string, number> = {
    admin: 0,
    manager: 1,
    viewer: 2,
    finance: 3,
    user: 4,
  };

  const sortedUsers = [...(users || [])].sort((a, b) => {
    const orderA = roleOrder[a.role] ?? 99;
    const orderB = roleOrder[b.role] ?? 99;
    return orderA - orderB;
  });

  // Filter users by selected role
  const filteredUsers = selectedRole 
    ? sortedUsers.filter(u => u.role === selectedRole)
    : sortedUsers;

  const admins = sortedUsers.filter((u) => u.role === "admin") || [];
  const managers = sortedUsers.filter((u) => u.role === "manager") || [];
  const viewers = sortedUsers.filter((u) => u.role === "viewer") || [];
  const finance = sortedUsers.filter((u) => u.role === "finance") || [];
  const regularUsers = sortedUsers.filter((u) => u.role === "user") || [];
  const usersWithNotifications = sortedUsers.filter((u) => u.receiveNotifications) || [];
  
  // Helper to check if user has a client protocol
  const getUserClientProtocol = (email: string | null) => {
    if (!email || !clientProtocols) return null;
    return clientProtocols.find(cp => cp.clientEmail === email);
  };

  const getRoleColor = (role: string) => {
    switch(role) {
      case 'admin': return 'bg-red-50 border-red-200';
      case 'manager': return 'bg-orange-50 border-orange-200';
      case 'viewer': return 'bg-blue-50 border-blue-200';
      case 'finance': return 'bg-green-50 border-green-200';
      default: return 'bg-gray-100 border-gray-200';
    }
  };
  
  const getRoleIcon = (role: string) => {
    switch(role) {
      case 'admin': return <Shield className="h-5 w-5 text-red-500" />;
      case 'manager': return <Shield className="h-5 w-5 text-orange-500" />;
      case 'viewer': return <Eye className="h-5 w-5 text-blue-500" />;
      case 'finance': return <DollarSign className="h-5 w-5 text-green-500" />;
      default: return <Users className="h-5 w-5 text-gray-600" />;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Team Management</h1>
            <p className="text-muted-foreground mt-1">
              Manage user roles and permissions for your team
            </p>
          </div>
          <div className="flex gap-2">
            {/* Invite Team Member Dialog */}
            <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Mail className="h-4 w-4" />
                  Invite Team Member
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite Team Member</DialogTitle>
                  <DialogDescription>
                    Send an invitation email to add a new team member. They'll receive a link to join with the specified role.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="invite-email">Email Address *</Label>
                    <Input
                      id="invite-email"
                      type="email"
                      placeholder="team@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invite-name">Name (optional)</Label>
                    <Input
                      id="invite-name"
                      placeholder="John Doe"
                      value={inviteName}
                      onChange={(e) => setInviteName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invite-role">Role</Label>
                    <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as any)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin - Full access</SelectItem>
                        <SelectItem value="manager">Manager - Manage clients & protocols</SelectItem>
                        <SelectItem value="viewer">Viewer - Read-only access</SelectItem>
                        <SelectItem value="finance">Finance - Payment management</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsInviteOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSendInvite} disabled={sendInviteMutation.isPending}>
                    {sendInviteMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="h-4 w-4 mr-2" />
                        Send Invitation
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          <Dialog open={isAddAdminOpen} onOpenChange={setIsAddAdminOpen}>
            <DialogTrigger asChild>
              <Button className="bg-red-500 hover:bg-red-600">
                <Plus className="h-4 w-4 mr-2" />
                Add Admin
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Admin</DialogTitle>
                <DialogDescription>
                  Select an existing user to promote to admin role
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="admin-email">User Email</Label>
                  <Input
                    id="admin-email"
                    type="email"
                    placeholder="user@example.com"
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddAdmin()}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    User must have already logged in to the app
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleAddAdmin}
                    disabled={updateRoleMutation.isPending || !newAdminEmail.trim()}
                    className="flex-1"
                  >
                    {updateRoleMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Promote to Admin
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setIsAddAdminOpen(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* Stat Cards - Clickable Filters */}
        <div className="grid gap-4 md:grid-cols-5">
          <Card 
            className={`cursor-pointer transition-all ${!selectedRole ? 'ring-2 ring-primary' : ''}`}
            onClick={() => setSelectedRole(null)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{sortedUsers?.length || 0}</div>
            </CardContent>
          </Card>
          <Card 
            className={`cursor-pointer transition-all ${selectedRole === 'admin' ? 'ring-2 ring-red-500' : ''}`}
            onClick={() => setSelectedRole('admin')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Admins</CardTitle>
              <Shield className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{admins.length}</div>
            </CardContent>
          </Card>
          <Card 
            className={`cursor-pointer transition-all ${selectedRole === 'manager' ? 'ring-2 ring-orange-500' : ''}`}
            onClick={() => setSelectedRole('manager')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Managers</CardTitle>
              <Shield className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{managers.length}</div>
            </CardContent>
          </Card>
          <Card 
            className={`cursor-pointer transition-all ${selectedRole === 'viewer' ? 'ring-2 ring-blue-500' : ''}`}
            onClick={() => setSelectedRole('viewer')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Viewers</CardTitle>
              <Eye className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{viewers.length}</div>
            </CardContent>
          </Card>
          <Card 
            className={`cursor-pointer transition-all ${selectedRole === 'finance' ? 'ring-2 ring-green-500' : ''}`}
            onClick={() => setSelectedRole('finance')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Finance</CardTitle>
              <DollarSign className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{finance.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Invitations */}
        {pendingInvitations && pendingInvitations.length > 0 && (
          <Card className="border-dashed border-2 border-orange-200 bg-orange-50/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-orange-500" />
                  <CardTitle>Pending Invitations</CardTitle>
                </div>
                <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300">
                  {pendingInvitations.length} pending
                </Badge>
              </div>
              <CardDescription>
                Team members who have been invited but haven't accepted yet
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingInvitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="p-4 rounded-lg border bg-white"
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 shrink-0 rounded-full bg-orange-100 flex items-center justify-center border border-orange-200">
                        <Mail className="h-5 w-5 text-orange-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium truncate">{invitation.name || invitation.email}</p>
                          <Badge variant="outline" className="capitalize">{invitation.role}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{invitation.email}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">
                            {getTimeRemaining(invitation.expiresAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3 pl-[52px]">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleResendInvite(invitation.email, invitation.name, invitation.role)}
                        disabled={sendInviteMutation.isPending}
                        className="gap-1"
                      >
                        <RefreshCw className="h-3 w-3" />
                        Resend
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRevokeInvite(invitation.id)}
                        disabled={revokeInvitationMutation.isPending}
                        className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="h-3 w-3" />
                        Revoke
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Users List */}
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedRole ? `${selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)} Users` : 'All Users'}
            </CardTitle>
            <CardDescription>
              {selectedRole ? `Showing ${filteredUsers.length} ${selectedRole} user(s)` : `Showing all ${filteredUsers.length} user(s)`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredUsers.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No users found</p>
            ) : (
              <div className="space-y-4">
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className={`p-4 rounded-lg border ${getRoleColor(user.role)}`}
                  >
                    {/* Top row: Avatar + User Info */}
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 shrink-0 rounded-full bg-white flex items-center justify-center border">
                        {getRoleIcon(user.role)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium truncate">{user.name || "Unnamed User"}</p>
                          {user.id === currentUser?.id && (
                            <Badge variant="outline">You</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                        <p className="text-xs text-muted-foreground">
                          Last sign in: {user.lastSignedIn ? format(new Date(user.lastSignedIn), "MMM d, yyyy 'at' h:mm a") : "Never"}
                        </p>
                      </div>
                    </div>

                    {/* Bottom row: Controls */}
                    <div className="flex flex-wrap items-center gap-3 mt-3 pl-[52px]">
                      {/* Role Selector */}
                      <Select
                        value={user.role}
                        onValueChange={(newRole) => handleRoleChange(user.id, newRole)}
                        disabled={updateRoleMutation.isPending || user.id === currentUser?.id}
                      >
                        <SelectTrigger className="w-[130px] h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="viewer">Viewer</SelectItem>
                          <SelectItem value="finance">Finance</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      {/* Reset Password */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 text-xs"
                        onClick={() => {
                          if (confirm(`Send password reset email to ${user.email}?`)) {
                            adminResetPasswordMutation.mutate({ userId: user.id });
                          }
                        }}
                        disabled={adminResetPasswordMutation.isPending}
                      >
                        <KeyRound className="h-3 w-3 mr-1" />
                        Reset Password
                      </Button>

                      {/* Notification Toggle */}
                      <div className="flex items-center gap-2">
                        {user.receiveNotifications ? (
                          <Bell className="h-4 w-4 text-green-500" />
                        ) : (
                          <BellOff className="h-4 w-4 text-muted-foreground" />
                        )}
                        <Switch
                          checked={user.receiveNotifications}
                          onCheckedChange={(checked) => handleNotificationToggle(user.id, checked)}
                          disabled={updateNotificationMutation.isPending}
                        />
                      </div>

                      {/* Link Team Member Profile */}
                      {(() => {
                        const linkedTm = getLinkedTeamMember(user.id);
                        if (linkedTm) {
                          return (
                            <div className="flex items-center gap-1">
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                                <Link2 className="h-3 w-3 mr-1" />
                                {linkedTm.name}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                                onClick={() => {
                                  if (confirm(`Unlink ${user.name || user.email} from team member profile "${linkedTm.name}"?`)) {
                                    unlinkUserMutation.mutate({ teamMemberId: linkedTm.id });
                                  }
                                }}
                                disabled={unlinkUserMutation.isPending}
                                title="Unlink team member profile"
                              >
                                <Unlink className="h-3 w-3" />
                              </Button>
                            </div>
                          );
                        }
                        return (
                          <Dialog open={linkingUserId === user.id} onOpenChange={(open) => {
                            if (!open) { setLinkingUserId(null); setSelectedTeamMemberId(""); }
                          }}>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-9 text-xs border-dashed"
                                onClick={() => setLinkingUserId(user.id)}
                              >
                                <Link2 className="h-3 w-3 mr-1" />
                                Link Team Profile
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Link Team Member Profile</DialogTitle>
                                <DialogDescription>
                                  Link {user.name || user.email}'s user account to a team member profile. This allows the system to show them their assigned tasks, send them the right notifications, and track their workload.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                  <Label>Select Team Member Profile</Label>
                                  <Select value={selectedTeamMemberId} onValueChange={setSelectedTeamMemberId}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Choose a team member..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {getUnlinkedTeamMembers(user.id).map((tm: any) => (
                                        <SelectItem key={tm.id} value={tm.id.toString()}>
                                          {tm.name} {tm.email ? `(${tm.email})` : ""}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <p className="text-xs text-muted-foreground">
                                    Only showing team members not already linked to another user account.
                                  </p>
                                </div>
                              </div>
                              <DialogFooter>
                                <Button variant="outline" onClick={() => { setLinkingUserId(null); setSelectedTeamMemberId(""); }}>
                                  Cancel
                                </Button>
                                <Button
                                  onClick={() => {
                                    if (!selectedTeamMemberId) {
                                      toast.error("Please select a team member profile");
                                      return;
                                    }
                                    linkUserMutation.mutate({
                                      teamMemberId: parseInt(selectedTeamMemberId),
                                      userId: user.id,
                                    });
                                  }}
                                  disabled={linkUserMutation.isPending || !selectedTeamMemberId}
                                >
                                  {linkUserMutation.isPending ? (
                                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Linking...</>
                                  ) : "Link Profile"}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        );
                      })()}

                      {/* Notification Email Edit */}
                      {user.receiveNotifications && (
                        <Dialog open={editingEmailUserId === user.id} onOpenChange={(open) => {
                          if (!open) setEditingEmailUserId(null);
                        }}>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingEmailUserId(user.id);
                                setEditingEmailValue((user as any).notificationEmail || user.email || "");
                              }}
                              className="text-xs h-9"
                            >
                              <Mail className="h-3 w-3 mr-1" />
                              {(user as any).notificationEmail ? "Custom Email" : "Set Email"}
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Notification Email</DialogTitle>
                              <DialogDescription>
                                Set a custom email address for receiving notifications. Leave empty to use the login email ({user.email}).
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div className="space-y-2">
                                <Label>Notification Email</Label>
                                <Input
                                  type="email"
                                  placeholder={user.email || "notification@example.com"}
                                  value={editingEmailValue}
                                  onChange={(e) => setEditingEmailValue(e.target.value)}
                                />
                                <p className="text-xs text-muted-foreground">
                                  Current: {(user as any).notificationEmail || user.email || "Not set"}
                                </p>
                              </div>
                            </div>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setEditingEmailUserId(null)}>
                                Cancel
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => {
                                  updateNotificationEmailMutation.mutate({
                                    userId: user.id,
                                    notificationEmail: null,
                                  });
                                  setEditingEmailUserId(null);
                                }}
                              >
                                Use Login Email
                              </Button>
                              <Button
                                onClick={() => {
                                  if (editingEmailValue && !editingEmailValue.includes("@")) {
                                    toast.error("Please enter a valid email address");
                                    return;
                                  }
                                  updateNotificationEmailMutation.mutate({
                                    userId: user.id,
                                    notificationEmail: editingEmailValue || null,
                                  });
                                  setEditingEmailUserId(null);
                                }}
                                disabled={updateNotificationEmailMutation.isPending}
                              >
                                {updateNotificationEmailMutation.isPending ? (
                                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</>
                                ) : "Save"}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-amber-50 border-amber-200">
          <CardHeader>
            <CardTitle className="text-amber-800">Role Permissions Guide</CardTitle>
          </CardHeader>
          <CardContent className="text-amber-700 space-y-3">
            <div>
              <p className="font-semibold text-red-700">Admin</p>
              <p className="text-sm">Full access to all features including user management, settings, and admin controls</p>
            </div>
            <div>
              <p className="font-semibold text-orange-700">Manager</p>
              <p className="text-sm">Can manage clients, protocols, waivers, and announcements but cannot modify admin settings or other admin accounts</p>
            </div>
            <div>
              <p className="font-semibold text-blue-700">Viewer</p>
              <p className="text-sm">Read-only access to protocols, analytics, operations, and client information</p>
            </div>
            <div>
              <p className="font-semibold text-green-700">Finance</p>
              <p className="text-sm">Can manage payments, refunds, and financial operations</p>
            </div>
            <div>
              <p className="font-semibold text-gray-600">User</p>
              <p className="text-sm">Can view their assigned protocols but cannot manage the system</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-800">How to Add New Team Members</CardTitle>
          </CardHeader>
          <CardContent className="text-blue-700">
            <ol className="list-decimal list-inside space-y-2">
              <li>Share the app URL with your team member</li>
              <li>Have them sign up with their email and password</li>
              <li>Once they have logged in, they will appear in the user list above</li>
              <li>Click "Add Admin" button or use the role selector dropdown to assign their permission level</li>
              <li>Toggle notifications to enable alerts for protocol approvals and views</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
