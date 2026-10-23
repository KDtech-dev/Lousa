<?php

namespace App\Models;

use Database\Factories\ClassroomFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Classroom extends Model
{
    /** @use HasFactory<ClassroomFactory> */
    use HasFactory;

    protected $fillable = ['name', 'description'];

    public function teacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    public function enrollments(): HasMany
    {
        return $this->hasMany(ClassroomEnrollment::class);
    }

    public function activeEnrollments(): HasMany
    {
        return $this->enrollments()->where('status', 'active');
    }

    public function students(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'classroom_enrollments', 'classroom_id', 'student_id')
            ->withPivot(['id', 'status'])
            ->withTimestamps()
            ->wherePivot('status', 'active');
    }
}
