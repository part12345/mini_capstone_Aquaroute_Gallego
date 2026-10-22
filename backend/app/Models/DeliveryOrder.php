<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DeliveryOrder extends Model
{
    use HasFactory;

    protected $fillable = [
        'customer_id',
        'order_number',
        'delivery_address',
        'delivery_date',
        'service_type',
        'quantity',
        'total_amount',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'delivery_date' => 'date',
            'quantity' => 'integer',
            'total_amount' => 'decimal:2',
        ];
    }

    public function customer()
    {
        return $this->belongsTo(User::class, 'customer_id');
    }

    public function assignment()
    {
        return $this->hasOne(Assignment::class);
    }
}
