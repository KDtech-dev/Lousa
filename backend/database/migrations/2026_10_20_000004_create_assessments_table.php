<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('assessments', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('teacher_id')->constrained('users')->restrictOnDelete();
            $table->string('title', 200);
            $table->string('subject', 160);
            $table->text('description')->nullable();
            $table->text('instructions')->nullable();
            $table->enum('status', ['draft', 'archived'])->default('draft');
            $table->timestamps();
            $table->index(['teacher_id', 'status', 'updated_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('assessments');
    }
};
