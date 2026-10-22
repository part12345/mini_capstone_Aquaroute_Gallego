<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DeliveryOrderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'order_number' => $this->order_number,
            'delivery_address' => $this->delivery_address,
            'delivery_date' => $this->delivery_date?->toDateString(),
            'service_type' => $this->service_type,
            'quantity' => $this->quantity,
            'total_amount' => (float) $this->total_amount,
            'status' => $this->status,

            'customer' => $this->whenLoaded('customer', function () {
                return [
                    'id' => $this->customer->id,
                    'name' => $this->customer->name,
                    'email' => $this->customer->email,
                ];
            }),

            'assignment' => $this->whenLoaded('assignment', function () {
                if (!$this->assignment) {
                    return null;
                }

                return [
                    'id' => $this->assignment->id,
                    'rider' => $this->assignment->relationLoaded('rider')
                        && $this->assignment->rider
                        ? [
                            'id' => $this->assignment->rider->id,
                            'name' => $this->assignment->rider->name,
                            'email' => $this->assignment->rider->email,
                        ]
                        : null,
                ];
            }),

            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
