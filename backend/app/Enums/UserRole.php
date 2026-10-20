<?php

namespace App\Enums;

enum UserRole: string
{
    case Teacher = 'teacher';
    case Student = 'student';
}
