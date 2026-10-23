<?php

namespace App\Enums;

enum EnrollmentStatus: string
{
    case Active = 'active';
    case Removed = 'removed';
}
