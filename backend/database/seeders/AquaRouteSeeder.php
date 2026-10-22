<?php

namespace Database\Seeders;

use App\Models\Assignment;
use App\Models\DeliveryOrder;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AquaRouteSeeder extends Seeder
{
    public function run(): void
    {
        // Create or update demo accounts.
        $manager = User::updateOrCreate(
            ['email' => 'manager@aquaroute.test'],
            [
                'name' => 'AquaRoute Manager',
                'password' => Hash::make('Password123!'),
                'role' => 'manager',
            ]
        );

        $rider = User::updateOrCreate(
            ['email' => 'rider@aquaroute.test'],
            [
                'name' => 'AquaRoute Rider',
                'password' => Hash::make('Password123!'),
                'role' => 'rider',
            ]
        );

        $customer = User::updateOrCreate(
            ['email' => 'customer@aquaroute.test'],
            [
                'name' => 'Demo Customer',
                'password' => Hash::make('Password123!'),
                'role' => 'customer',
            ]
        );

        // Create 20 sample delivery orders.
        $statuses = [
            'Pending',
            'Confirmed',
            'Out for Delivery',
            'Delivered',
            'Cancelled',
        ];

        for ($i = 1; $i <= 20; $i++) {
            $status = $statuses[($i - 1) % count($statuses)];

            $order = DeliveryOrder::updateOrCreate(
                ['order_number' => 'AR-DEMO-' . str_pad($i, 3, '0', STR_PAD_LEFT)],
                [
                    'customer_id' => $customer->id,
                    'delivery_address' => ($i % 2 === 0)
                        ? 'Tanjay City, Negros Oriental'
                        : 'Poblacion, Tanjay City, Negros Oriental',
                    'delivery_date' => now()
                        ->addDays(($i % 10) + 1)
                        ->toDateString(),
                    'service_type' => $i % 2 === 0 ? 'exchange' : 'refill',
                    'quantity' => ($i % 4) + 1,
                    'total_amount' => ($i % 2 === 0 ? 30 : 15) * (($i % 4) + 1),
                    'status' => $status,
                ]
            );

            // Assign selected orders to the demo rider.
            if (in_array($status, ['Confirmed', 'Out for Delivery'], true)) {
                Assignment::updateOrCreate(
                    ['delivery_order_id' => $order->id],
                    ['rider_id' => $rider->id]
                );
            }
        }

        $this->command?->info('AquaRoute demo users and 20 delivery orders created.');
    }
}
