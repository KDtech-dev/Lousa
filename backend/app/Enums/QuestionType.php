<?php

namespace App\Enums;

enum QuestionType: string
{
    case Single = 'single';
    case Boolean = 'boolean';
    case Open = 'open';
}
