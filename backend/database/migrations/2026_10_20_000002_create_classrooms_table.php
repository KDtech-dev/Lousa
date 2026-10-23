<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('classrooms', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('teacher_id')->constrained('users')->restrictOnDelete();
            $table->string('name', 160);
            $table->text('description')->nullable();
            $table->timestamps();
            $table->index(['teacher_id', 'name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('classrooms');
    }
};
