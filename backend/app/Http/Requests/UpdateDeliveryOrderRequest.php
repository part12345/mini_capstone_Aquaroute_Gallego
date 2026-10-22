<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateDeliveryOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return $user !== null
            && in_array($user->role, ['customer', 'manager'], true);
    }

    public function rules(): array
    {
        return [
            'delivery_address' => ['sometimes', 'required', 'string', 'max:500'],
            'delivery_date' => ['sometimes', 'required', 'date', 'after_or_equal:today'],
            'service_type' => [
                'sometimes',
                'required',
                Rule::in(['refill', 'exchange']),
            ],
            'quantity' => ['sometimes', 'required', 'integer', 'min:1', 'max:100'],
        ];
    }
}
