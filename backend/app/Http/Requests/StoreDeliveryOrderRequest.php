<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreDeliveryOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null
            && in_array($this->user()->role, ['customer', 'manager'], true);
    }

    public function rules(): array
    {
        return [
            'delivery_address' => ['required', 'string', 'max:500'],
            'delivery_date' => ['required', 'date', 'after_or_equal:today'],
            'service_type' => [
                'required',
                Rule::in(['refill', 'exchange']),
            ],
            'quantity' => ['required', 'integer', 'min:1', 'max:100'],
        ];
    }
}
