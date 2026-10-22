<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Assignment;
use App\Models\DeliveryOrder;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AssignmentController extends Controller
{
    public function index()
    {
        $assignments = Assignment::with([
            'deliveryOrder',
            'rider:id,name,email',
        ])->latest()->paginate(10);

        $riders = User::where('role', 'rider')
            ->select('id', 'name', 'email')
            ->orderBy('name')
            ->get();

        $availableOrders = DeliveryOrder::whereIn(
            'status',
            ['Pending', 'Confirmed']
        )
            ->whereDoesntHave('assignment')
            ->orderBy('delivery_date')
            ->get();

        return response()->json([
            'data' => $assignments->items(),
            'current_page' => $assignments->currentPage(),
            'last_page' => $assignments->lastPage(),
            'per_page' => $assignments->perPage(),
            'total' => $assignments->total(),
            'riders' => $riders,
            'available_orders' => $availableOrders,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'delivery_order_id' => [
                'required',
                'integer',
                'exists:delivery_orders,id',
                'unique:assignments,delivery_order_id',
            ],
            'rider_id' => [
                'required',
                'integer',
                Rule::exists('users', 'id')
                    ->where('role', 'rider'),
            ],
        ]);

        $order = DeliveryOrder::findOrFail(
            $validated['delivery_order_id']
        );

        if (!in_array(
            $order->status,
            ['Pending', 'Confirmed'],
            true
        )) {
            return response()->json([
                'message' =>
                    'Only pending or confirmed orders can be assigned.',
            ], 422);
        }

        $assignment = Assignment::create($validated);

        return response()->json([
            'message' => 'Rider assigned successfully.',
            'assignment' => $assignment->load([
                'deliveryOrder',
                'rider:id,name,email',
            ]),
        ], 201);
    }

    public function update(Request $request, string $id)
    {
        $assignment = Assignment::findOrFail($id);

        $validated = $request->validate([
            'rider_id' => [
                'required',
                'integer',
                Rule::exists('users', 'id')
                    ->where('role', 'rider'),
            ],
        ]);

        if (!in_array(
            $assignment->deliveryOrder->status,
            ['Pending', 'Confirmed'],
            true
        )) {
            return response()->json([
                'message' =>
                    'The rider cannot be changed after delivery begins.',
            ], 422);
        }

        $assignment->update([
            'rider_id' => $validated['rider_id'],
        ]);

        return response()->json([
            'message' => 'Rider assignment updated successfully.',
            'assignment' => $assignment->fresh()->load([
                'deliveryOrder',
                'rider:id,name,email',
            ]),
        ]);
    }

    public function destroy(string $id)
    {
        $assignment = Assignment::findOrFail($id);

        if (!in_array(
            $assignment->deliveryOrder->status,
            ['Pending', 'Confirmed'],
            true
        )) {
            return response()->json([
                'message' =>
                    'The assignment cannot be removed after delivery begins.',
            ], 422);
        }

        $assignment->delete();

        return response()->json([
            'message' => 'Rider assignment removed successfully.',
        ]);
    }
}
