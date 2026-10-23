<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('questions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('assessment_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('position');
            $table->enum('type', ['single', 'boolean', 'open']);
            $table->text('prompt');
            $table->json('options');
            $table->string('correct_answer', 1000)->nullable();
            $table->decimal('points', 8, 2);
            $table->timestamps();
            $table->unique(['assessment_id', 'position']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('questions');
    }
};
