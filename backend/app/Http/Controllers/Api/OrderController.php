<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreDeliveryOrderRequest;
use App\Http\Requests\UpdateDeliveryOrderRequest;
use App\Http\Resources\DeliveryOrderResource;
use App\Models\DeliveryOrder;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class OrderController extends Controller
{
    /**
     * Display delivery orders with search, filtering, and pagination.
     */
    public function index(Request $request)
    {
        $user = $request->user();

        $query = DeliveryOrder::with([
            'customer:id,name,email',
            'assignment.rider:id,name,email',
        ]);

        // Customers see their own orders.
        if ($user->role === 'customer') {
            $query->where('customer_id', $user->id);
        }

        // Riders see orders assigned to them.
        elseif ($user->role === 'rider') {
            $query->whereHas('assignment', function ($assignment) use ($user) {
                $assignment->where('rider_id', $user->id);
            });
        }

        // Search by order number or delivery address.
        if ($request->filled('search')) {
            $search = $request->input('search');

            $query->where(function ($q) use ($search) {
                $q->where('order_number', 'like', "%{$search}%")
                    ->orWhere('delivery_address', 'like', "%{$search}%");
            });
        }

        // Filter by delivery status.
        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        $orders = $query->latest()->paginate(10);

        return DeliveryOrderResource::collection($orders);
    }

    /**
     * Create a new delivery order.
     */
    public function store(StoreDeliveryOrderRequest $request)
    {
        $validated = $request->validated();

        $prices = [
            'refill' => 15,
            'exchange' => 30,
        ];

        $order = DeliveryOrder::create([
            'customer_id' => $request->user()->id,
            'order_number' => 'AR-' . now()->format('YmdHis') . '-' . random_int(100, 999),
            'delivery_address' => $validated['delivery_address'],
            'delivery_date' => $validated['delivery_date'],
            'service_type' => $validated['service_type'],
            'quantity' => $validated['quantity'],
            'total_amount' => $prices[$validated['service_type']]
                * $validated['quantity'],
            'status' => 'Pending',
        ]);

        $order->load([
            'customer:id,name,email',
            'assignment.rider:id,name,email',
        ]);

        return response()->json([
            'message' => 'Delivery order created successfully.',
            'order' => new DeliveryOrderResource($order),
        ], 201);
    }

    /**
     * Display one delivery order.
     */
    public function show(Request $request, string $id)
    {
        $order = DeliveryOrder::with([
            'customer:id,name,email',
            'assignment.rider:id,name,email',
        ])->findOrFail($id);

        $this->authorizeOrderAccess($request, $order);

        return response()->json([
            'order' => new DeliveryOrderResource($order),
        ]);
    }

    /**
     * Update an existing pending delivery order.
     */
    public function update(
        UpdateDeliveryOrderRequest $request,
        string $id
    ) {
        $order = DeliveryOrder::findOrFail($id);
        $user = $request->user();

        abort_unless(
            $user->role === 'manager'
                || (
                    $user->role === 'customer'
                    && $order->customer_id === $user->id
                ),
            403,
            'You cannot edit this order.'
        );

        abort_if(
            $order->status !== 'Pending',
            422,
            'Only pending orders can be edited.'
        );

        $validated = $request->validated();

        $newType = $validated['service_type'] ?? $order->service_type;
        $newQuantity = $validated['quantity'] ?? $order->quantity;

        $prices = [
            'refill' => 15,
            'exchange' => 30,
        ];

        $validated['total_amount'] =
            $prices[$newType] * $newQuantity;

        $order->update($validated);

        $order->load([
            'customer:id,name,email',
            'assignment.rider:id,name,email',
        ]);

        return response()->json([
            'message' => 'Delivery order updated successfully.',
            'order' => new DeliveryOrderResource($order),
        ]);
    }

    /**
     * Delete a pending or cancelled delivery order.
     */
    public function destroy(Request $request, string $id)
    {
        $order = DeliveryOrder::findOrFail($id);
        $user = $request->user();

        abort_unless(
            $user->role === 'manager'
                || (
                    $user->role === 'customer'
                    && $order->customer_id === $user->id
                ),
            403,
            'You cannot delete this order.'
        );

        abort_if(
            !in_array($order->status, ['Pending', 'Cancelled'], true),
            422,
            'Only pending or cancelled orders can be deleted.'
        );

        $order->delete();

        return response()->json([
            'message' => 'Delivery order deleted successfully.',
        ]);
    }

    /**
     * Update the status of a delivery order.
     */
    public function updateStatus(Request $request, string $id)
    {
        $order = DeliveryOrder::with('assignment')->findOrFail($id);
        $user = $request->user();

        $validated = $request->validate([
            'status' => [
                'required',
                Rule::in([
                    'Confirmed',
                    'Out for Delivery',
                    'Delivered',
                    'Cancelled',
                ]),
            ],
        ]);

        $newStatus = $validated['status'];

        if ($user->role === 'manager') {
            // Managers may update order status.
        } elseif ($user->role === 'rider') {
            abort_unless(
                $order->assignment
                    && $order->assignment->rider_id === $user->id,
                403,
                'This order is not assigned to you.'
            );

            abort_unless(
                in_array(
                    $newStatus,
                    ['Out for Delivery', 'Delivered'],
                    true
                ),
                403,
                'Riders can only update delivery progress.'
            );
        } else {
            abort(403, 'You are not authorized to update order status.');
        }

        $allowedTransitions = [
            'Pending' => ['Confirmed', 'Cancelled'],
            'Confirmed' => ['Out for Delivery', 'Cancelled'],
            'Out for Delivery' => ['Delivered'],
            'Delivered' => [],
            'Cancelled' => [],
        ];

        abort_unless(
            in_array(
                $newStatus,
                $allowedTransitions[$order->status] ?? [],
                true
            ),
            422,
            'This status transition is not allowed.'
        );

        $order->update([
            'status' => $newStatus,
        ]);

        $order->load([
            'customer:id,name,email',
            'assignment.rider:id,name,email',
        ]);

        return response()->json([
            'message' => 'Order status updated successfully.',
            'order' => new DeliveryOrderResource($order),
        ]);
    }

    /**
     * Check whether the current user can view this order.
     */
    private function authorizeOrderAccess(
        Request $request,
        DeliveryOrder $order
    ): void {
        $user = $request->user();

        if ($user->role === 'manager') {
            return;
        }

        if (
            $user->role === 'customer'
            && $order->customer_id === $user->id
        ) {
            return;
        }

        if (
            $user->role === 'rider'
            && $order->assignment?->rider_id === $user->id
        ) {
            return;
        }

        abort(403, 'You are not authorized to view this order.');
    }
}
