<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('delivery_orders', function (Blueprint $table) {
            $table->id();

            $table->foreignId('customer_id')
                ->constrained('users')
                ->cascadeOnDelete();

            $table->string('order_number')->unique();
            $table->string('delivery_address');
            $table->date('delivery_date');

            $table->enum('service_type', [
                'refill',
                'exchange'
            ]);

            $table->unsignedInteger('quantity');
            $table->decimal('total_amount', 10, 2);

            $table->enum('status', [
                'Pending',
                'Confirmed',
                'Out for Delivery',
                'Delivered',
                'Cancelled'
            ])->default('Pending');

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('delivery_orders');
    }
};