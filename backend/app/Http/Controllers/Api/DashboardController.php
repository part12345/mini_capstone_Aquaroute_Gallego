<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DeliveryOrder;
use App\Models\User;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        $orders = DeliveryOrder::query();

        if ($user->role === 'customer') {
            $orders->where('customer_id', $user->id);
        } elseif ($user->role === 'rider') {
            $orders->whereHas('assignment', function ($query) use ($user) {
                $query->where('rider_id', $user->id);
            });
        }

        $totalOrders = (clone $orders)->count();

        $pendingOrders = (clone $orders)
            ->where('status', 'Pending')
            ->count();

        $inProgressOrders = (clone $orders)
            ->whereIn('status', ['Confirmed', 'Out for Delivery'])
            ->count();

        $deliveredOrders = (clone $orders)
            ->where('status', 'Delivered')
            ->count();

        $statistics = [
            'total_orders' => $totalOrders,
            'pending_orders' => $pendingOrders,
            'in_progress_orders' => $inProgressOrders,
            'delivered_orders' => $deliveredOrders,
        ];

        // Only managers can see overall customer totals and revenue.
        if ($user->role === 'manager') {
            $statistics['total_customers'] = User::where('role', 'customer')->count();

            $statistics['total_revenue'] = DeliveryOrder::where(
                'status',
                'Delivered'
            )->sum('total_amount');
        }

        return response()->json([
            'message' => 'Dashboard statistics retrieved successfully.',
            'statistics' => $statistics,
        ]);
    }
}
