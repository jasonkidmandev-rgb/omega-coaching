import React, { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { trpc } from "@/lib/trpc";
import { CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";

export default function RefundManagement() {
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [action, setAction] = useState<"approve" | "reject" | null>(null);
  const [notes, setNotes] = useState("");
  const [refundAmount, setRefundAmount] = useState("");

  // Fetch all refund requests
  const { data: refundData, isLoading, refetch } = trpc.refund.getAll.useQuery({
    status: undefined,
    limit: 100,
  });

  // Mutations
  const approveMutation = trpc.refund.approve.useMutation();
  const rejectMutation = trpc.refund.reject.useMutation();
  const processMutation = trpc.refund.markProcessed.useMutation();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "approved":
        return "bg-blue-100 text-blue-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "processed":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="w-4 h-4" />;
      case "rejected":
        return <XCircle className="w-4 h-4" />;
      case "processed":
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const handleApprove = async () => {
    if (!selectedRequest || !refundAmount) return;

    try {
      await approveMutation.mutateAsync({
        requestId: selectedRequest.id,
        refundAmount,
        notes,
      });
      setSelectedRequest(null);
      setAction(null);
      setNotes("");
      setRefundAmount("");
      refetch();
    } catch (error) {
      console.error("Error approving refund:", error);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !notes) return;

    try {
      await rejectMutation.mutateAsync({
        requestId: selectedRequest.id,
        notes,
      });
      setSelectedRequest(null);
      setAction(null);
      setNotes("");
      refetch();
    } catch (error) {
      console.error("Error rejecting refund:", error);
    }
  };

  const handleMarkProcessed = async (requestId: number) => {
    try {
      await processMutation.mutateAsync({ requestId });
      refetch();
    } catch (error) {
      console.error("Error marking refund as processed:", error);
    }
  };

  const pendingRequests = refundData?.data?.filter((r) => r.status === "pending") || [];
  const approvedRequests = refundData?.data?.filter((r) => r.status === "approved") || [];
  const rejectedRequests = refundData?.data?.filter((r) => r.status === "rejected") || [];
  const processedRequests = refundData?.data?.filter((r) => r.status === "processed") || [];

  return (
    <AdminLayout>
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Refund Management</h1>
        <p className="text-gray-600 mt-2">Review and process client refund requests</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingRequests.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{approvedRequests.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Processed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{processedRequests.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Rejected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{rejectedRequests.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-900">
              <AlertCircle className="w-5 h-5" />
              Pending Refund Requests
            </CardTitle>
            <CardDescription className="text-yellow-800">
              {pendingRequests.length} request(s) awaiting review
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">Protocol #{request.protocolId}</TableCell>
                      <TableCell className="text-sm max-w-xs truncate">{request.reason}</TableCell>
                      <TableCell className="text-sm">
                        {request.requestedAt
                          ? new Date(request.requestedAt).toLocaleDateString()
                          : "N/A"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedRequest(request);
                              setAction("approve");
                            }}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedRequest(request);
                              setAction("reject");
                            }}
                          >
                            Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Refund Requests */}
      <Card>
        <CardHeader>
          <CardTitle>All Refund Requests</CardTitle>
          <CardDescription>
            Total: {refundData?.total || 0} requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading refund requests...</div>
          ) : refundData?.data && refundData.data.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Protocol ID</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {refundData.data.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">#{request.protocolId}</TableCell>
                      <TableCell className="text-sm max-w-xs truncate">{request.reason}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(request.status || "pending")}>
                          <span className="flex items-center gap-1">
                            {getStatusIcon(request.status || "pending")}
                            {request.status?.toUpperCase() || "PENDING"}
                          </span>
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {request.refundAmount ? `$${request.refundAmount}` : "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {request.requestedAt
                          ? new Date(request.requestedAt).toLocaleDateString()
                          : "N/A"}
                      </TableCell>
                      <TableCell>
                        {request.status === "approved" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleMarkProcessed(request.id)}
                          >
                            Mark Processed
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">No refund requests found</div>
          )}
        </CardContent>
      </Card>

      {/* Action Dialog */}
      <Dialog open={!!action} onOpenChange={() => setAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {action === "approve" ? "Approve Refund Request" : "Reject Refund Request"}
            </DialogTitle>
            <DialogDescription>
              Protocol #{selectedRequest?.protocolId}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {action === "approve" && (
              <>
                <div>
                  <label className="text-sm font-medium">Refund Amount *</label>
                  <input
                    type="text"
                    placeholder="e.g., 299.99"
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md mt-1"
                  />
                </div>
              </>
            )}

            <div>
              <label className="text-sm font-medium">
                {action === "approve" ? "Admin Notes (Optional)" : "Rejection Reason *"}
              </label>
              <Textarea
                placeholder={
                  action === "approve"
                    ? "Add any notes about this approval..."
                    : "Explain why this refund request is being rejected..."
                }
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setAction(null)}>
                Cancel
              </Button>
              <Button
                onClick={action === "approve" ? handleApprove : handleReject}
                disabled={
                  action === "approve"
                    ? !refundAmount
                    : !notes || approveMutation.isPending || rejectMutation.isPending
                }
              >
                {action === "approve" ? "Approve Refund" : "Reject Request"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </AdminLayout>
  );
}