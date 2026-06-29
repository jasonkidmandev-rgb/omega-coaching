import { useState } from "react";
import { useParams, Link } from "wouter";
import { trpc } from "../lib/trpc";
import { toLocaleDateStringMT } from "../lib/timezone";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  CreditCard,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCcw,
  FileText,
  ExternalLink,
  Wallet,
  ArrowLeft,
} from "lucide-react";

export default function ClientPaymentPortal() {
  const { token } = useParams<{ token: string }>();
  const [selectedProtocolId, setSelectedProtocolId] = useState<number | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  const { data: paymentsData, isLoading } = trpc.clientPaymentPortal.getMyPayments.useQuery(
    { accessToken: token || "" },
    { enabled: !!token }
  );

  const { data: detailsData, isLoading: detailsLoading } = trpc.clientPaymentPortal.getPaymentDetails.useQuery(
    { accessToken: token || "", protocolId: selectedProtocolId || 0 },
    { enabled: !!selectedProtocolId && detailsDialogOpen }
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return (
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
            <CheckCircle className="h-3 w-3 mr-1" />
            Paid
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case "failed":
        return (
          <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
            <XCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      case "refunded":
        return (
          <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
            <RefreshCcw className="h-3 w-3 mr-1" />
            Refunded
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPaymentMethodIcon = (method: string | null) => {
    switch (method) {
      case "paypal":
        return <span className="text-blue-400">PayPal (Legacy)</span>;
      case "venmo":
        return <span className="text-blue-300">Venmo</span>;
      case "cc":
        return <span className="text-gray-300">Credit Card</span>;

      default:
        return <span className="text-gray-400">-</span>;
    }
  };

  const formatDate = (date: string | Date | null) => {
    if (!date) return "-";
    return toLocaleDateStringMT(date, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const handleViewDetails = (protocolId: number) => {
    setSelectedProtocolId(protocolId);
    setDetailsDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-950 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-8 w-64 bg-gray-800" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-32 bg-gray-800" />
            <Skeleton className="h-32 bg-gray-800" />
            <Skeleton className="h-32 bg-gray-800" />
          </div>
          <Skeleton className="h-64 bg-gray-800" />
        </div>
      </div>
    );
  }

  if (!paymentsData?.success || !paymentsData.data) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-950 flex items-center justify-center p-6">
        <Card className="bg-gray-800/50 border-gray-700 max-w-md w-full">
          <CardHeader className="text-center">
            <XCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <CardTitle className="text-white">Access Denied</CardTitle>
            <CardDescription className="text-gray-400">
              Invalid or expired access token. Please use the link from your protocol email.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const { clientName, clientEmail, payments, summary } = paymentsData.data;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-950 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Payment Portal</h1>
            <p className="text-gray-400">
              Welcome, {clientName} ({clientEmail})
            </p>
          </div>
          <Link href={`/protocol/${token}`}>
            <Button variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-800">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Protocol
            </Button>
          </Link>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader className="pb-2">
              <CardDescription className="text-gray-400 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                Total Paid
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-400">
                {formatCurrency(summary.totalPaid)}
              </p>
              <p className="text-sm text-gray-500">{summary.paidCount} payment(s)</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader className="pb-2">
              <CardDescription className="text-gray-400 flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-400" />
                Outstanding Balance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-yellow-400">
                {formatCurrency(summary.totalPending)}
              </p>
              <p className="text-sm text-gray-500">{summary.pendingCount} pending</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader className="pb-2">
              <CardDescription className="text-gray-400 flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-400" />
                Total Protocols
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-white">{summary.totalProtocols}</p>
              <p className="text-sm text-gray-500">All time</p>
            </CardContent>
          </Card>
        </div>

        {/* Payment History Table */}
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Wallet className="h-5 w-5 text-orange-400" />
              Payment History
            </CardTitle>
            <CardDescription className="text-gray-400">
              View all your protocols and payment status
            </CardDescription>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No payment history found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-700 hover:bg-transparent">
                    <TableHead className="text-gray-400">Protocol</TableHead>
                    <TableHead className="text-gray-400">Date</TableHead>
                    <TableHead className="text-gray-400">Amount</TableHead>
                    <TableHead className="text-gray-400">Method</TableHead>
                    <TableHead className="text-gray-400">Status</TableHead>
                    <TableHead className="text-gray-400 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id} className="border-gray-700 hover:bg-gray-800/50">
                      <TableCell className="text-white font-medium">
                        {payment.protocolName}
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {formatDate(payment.createdAt)}
                      </TableCell>
                      <TableCell className="text-white font-medium">
                        {formatCurrency(payment.amount)}
                      </TableCell>
                      <TableCell>{getPaymentMethodIcon(payment.paymentMethod)}</TableCell>
                      <TableCell>{getStatusBadge(payment.paymentStatus)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(payment.id)}
                            className="text-gray-400 hover:text-white"
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                          {payment.paymentStatus === "pending" && (
                            <Link href={`/protocol/${payment.accessToken}`}>
                              <Button
                                size="sm"
                                className="bg-orange-500 hover:bg-orange-600 text-white"
                              >
                                <DollarSign className="h-4 w-4 mr-1" />
                                Pay Now
                              </Button>
                            </Link>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Payment Details Dialog */}
        <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
          <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-orange-400" />
                Payment Details
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                Detailed breakdown of your protocol payment
              </DialogDescription>
            </DialogHeader>

            {detailsLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-6 w-full bg-gray-700" />
                <Skeleton className="h-6 w-full bg-gray-700" />
                <Skeleton className="h-6 w-full bg-gray-700" />
              </div>
            ) : detailsData?.success && detailsData.data ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Status</span>
                  {getStatusBadge(detailsData.data.paymentStatus)}
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Created</span>
                  <span className="text-white">{formatDate(detailsData.data.createdAt)}</span>
                </div>

                {detailsData.data.paymentReceivedAt && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Paid On</span>
                    <span className="text-green-400">
                      {formatDate(detailsData.data.paymentReceivedAt)}
                    </span>
                  </div>
                )}

                <hr className="border-gray-700" />

                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-400">Items</h4>
                  {detailsData.data.items.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span className="text-gray-300">
                        {item.name} x{item.quantity}
                      </span>
                      <span className="text-white">{formatCurrency(item.total)}</span>
                    </div>
                  ))}
                </div>

                {detailsData.data.coachingPrice > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-300">Coaching</span>
                    <span className="text-white">
                      {formatCurrency(detailsData.data.coachingPrice)}
                    </span>
                  </div>
                )}

                <hr className="border-gray-700" />

                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Subtotal</span>
                  <span className="text-white">{formatCurrency(detailsData.data.subtotal)}</span>
                </div>

                {detailsData.data.discountPercent > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">
                      Discount ({detailsData.data.discountPercent}%)
                    </span>
                    <span className="text-green-400">
                      -{formatCurrency(detailsData.data.discountAmount)}
                    </span>
                  </div>
                )}

                <div className="flex justify-between text-lg font-bold">
                  <span className="text-white">Total</span>
                  <span className="text-orange-400">{formatCurrency(detailsData.data.total)}</span>
                </div>

                {detailsData.data.paymentStatus === "pending" && (
                  <Link href={`/protocol/${detailsData.data.accessToken}`}>
                    <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white mt-4">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Go to Payment Page
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-400">
                Failed to load payment details
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
