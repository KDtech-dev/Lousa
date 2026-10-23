<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('classroom_enrollments', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('classroom_id')->constrained()->restrictOnDelete();
            $table->foreignId('student_id')->constrained('users')->restrictOnDelete();
            $table->enum('status', ['active', 'removed'])->default('active');
            $table->timestamps();
            $table->unique(['classroom_id', 'student_id']);
            $table->index(['student_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('classroom_enrollments');
    }
};
