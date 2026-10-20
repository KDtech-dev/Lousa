import { ArrowDown, ArrowUp, Check, Plus, Trash2 } from "lucide-react";
import type { Question, QuestionType } from "../types";

interface QuestionEditorProps {
  question: Question;
  index: number;
  total: number;
  error?: string;
  errorField?: "prompt" | "points" | "options" | "correctAnswer";
  onChange: (question: Question) => void;
  onRemove: () => void;
  onMove: (direction: -1 | 1) => void;
}
export default function QuestionEditor({
  question,
  index,
  total,
  error,
  errorField,
  onChange,
  onRemove,
  onMove,
}: QuestionEditorProps) {
  const fieldId = `question-${question.id}`;
  const errorId = `${fieldId}-error`;
  const invalidOptions = question.options.map(
    (option, optionIndex) =>
      !option.trim() ||
      question.options.some(
        (other, otherIndex) =>
          otherIndex !== optionIndex &&
          other.trim().toLocaleLowerCase("pt-BR") ===
            option.trim().toLocaleLowerCase("pt-BR"),
      ),
  );
  function isInvalid(field: QuestionEditorProps["errorField"]) {
    return Boolean(error && errorField === field);
  }
  function changeType(type: QuestionType) {
    onChange({
      ...question,
      type,
      options:
        type === "single"
          ? ["", "", "", ""]
          : type === "boolean"
            ? ["Verdadeiro", "Falso"]
            : [],
      correctAnswer: null,
    });
  }
  function changeOption(optionIndex: number, value: string) {
    const old = question.options[optionIndex];
    onChange({
      ...question,
      options: question.options.map((option, current) =>
        current === optionIndex ? value : option,
      ),
      correctAnswer:
        question.correctAnswer === old && old !== ""
          ? value
          : question.correctAnswer,
    });
  }
  return (
    <article
      className={`card question-editor ${error ? "has-error" : ""}`}
      aria-describedby={error && !errorField ? errorId : undefined}
    >
      <div className="question-editor-header">
        <span className="question-number">
          {String(index + 1).padStart(2, "0")}
        </span>
        <div>
          <h3>Questão {index + 1}</h3>
          <span className="muted">
            {question.type === "single"
              ? "Alternativa única"
              : question.type === "boolean"
                ? "Verdadeiro ou falso"
                : "Resposta aberta"}
          </span>
        </div>
        <div className="question-actions">
          <button
            className="icon-button"
            aria-label={`Mover questão ${index + 1} para cima`}
            disabled={index === 0}
            onClick={() => onMove(-1)}
          >
            <ArrowUp size={16} />
          </button>
          <button
            className="icon-button"
            aria-label={`Mover questão ${index + 1} para baixo`}
            disabled={index === total - 1}
            onClick={() => onMove(1)}
          >
            <ArrowDown size={16} />
          </button>
          <button
            className="icon-button question-delete"
            aria-label={`Remover questão ${index + 1}`}
            onClick={onRemove}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      <div className="form-grid question-settings">
        <label className="field">
          <span>Tipo de questão</span>
          <select
            value={question.type}
            onChange={(event) => changeType(event.target.value as QuestionType)}
          >
            <option value="single">Alternativa única</option>
            <option value="boolean">Verdadeiro ou falso</option>
            <option value="open">Resposta aberta</option>
          </select>
        </label>
        <label className="field">
          <span>Pontuação</span>
          <input
            id={`${fieldId}-points`}
            type="number"
            min="0.1"
            max="10000"
            step="0.1"
            value={question.points}
            aria-invalid={isInvalid("points")}
            aria-describedby={isInvalid("points") ? errorId : undefined}
            onChange={(event) =>
              onChange({ ...question, points: Number(event.target.value) })
            }
          />
        </label>
      </div>
      <label className="field">
        <span>
          Enunciado <span className="required">*</span>
        </span>
        <textarea
          id={`${fieldId}-prompt`}
          rows={3}
          placeholder="Escreva a pergunta e as orientações para o aluno..."
          value={question.prompt}
          maxLength={10000}
          aria-invalid={isInvalid("prompt")}
          aria-describedby={isInvalid("prompt") ? errorId : undefined}
          onChange={(event) =>
            onChange({ ...question, prompt: event.target.value })
          }
        />
      </label>
      {question.type === "single" && (
        <fieldset
          className="question-options"
          aria-describedby={
            isInvalid("options") || isInvalid("correctAnswer")
              ? errorId
              : undefined
          }
        >
          <legend>
            Alternativas{" "}
            <span className="muted">· marque a resposta correta</span>
          </legend>
          {question.options.map((option, optionIndex) => (
            <div
              className={`question-option-row ${option !== "" && question.correctAnswer === option ? "correct" : ""}`}
              key={optionIndex}
            >
              <input
                id={optionIndex === 0 ? `${fieldId}-correct` : undefined}
                type="radio"
                name={`answer-${question.id}`}
                aria-label={`Alternativa ${optionIndex + 1} é a resposta correta da questão ${index + 1}`}
                checked={option !== "" && question.correctAnswer === option}
                disabled={!option.trim()}
                aria-invalid={isInvalid("correctAnswer")}
                aria-describedby={
                  isInvalid("correctAnswer") ? errorId : undefined
                }
                onChange={() =>
                  onChange({ ...question, correctAnswer: option })
                }
              />
              <span className="option-letter" aria-hidden="true">
                {String.fromCharCode(65 + optionIndex)}
              </span>
              <label className="question-option-field">
                <span>Alternativa {optionIndex + 1}</span>
                <input
                  id={`${fieldId}-option-${optionIndex}`}
                  value={option}
                  maxLength={2000}
                  aria-label={`Texto da alternativa ${optionIndex + 1} da questão ${index + 1}`}
                  aria-invalid={
                    isInvalid("options") && invalidOptions[optionIndex]
                  }
                  aria-describedby={
                    isInvalid("options") && invalidOptions[optionIndex]
                      ? errorId
                      : undefined
                  }
                  placeholder="Escreva o texto da alternativa"
                  onChange={(event) =>
                    changeOption(optionIndex, event.target.value)
                  }
                />
              </label>
              {option !== "" && question.correctAnswer === option && (
                <Check size={16} aria-label="Resposta correta" />
              )}
              <button
                className="icon-button"
                disabled={question.options.length <= 2}
                aria-label={`Remover alternativa ${optionIndex + 1}`}
                onClick={() =>
                  onChange({
                    ...question,
                    options: question.options.filter(
                      (_, current) => current !== optionIndex,
                    ),
                    correctAnswer:
                      question.correctAnswer === option
                        ? null
                        : question.correctAnswer,
                  })
                }
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          {question.options.length < 8 && (
            <button
              className="button ghost small"
              onClick={() =>
                onChange({ ...question, options: [...question.options, ""] })
              }
            >
              <Plus size={15} /> Adicionar alternativa
            </button>
          )}
        </fieldset>
      )}
      {question.type === "boolean" && (
        <fieldset
          className="boolean-answer"
          aria-describedby={isInvalid("correctAnswer") ? errorId : undefined}
        >
          <legend>
            Gabarito <span className="required">*</span>
          </legend>
          {["Verdadeiro", "Falso"].map((value, optionIndex) => (
            <label
              key={value}
              className={question.correctAnswer === value ? "selected" : ""}
            >
              <input
                id={optionIndex === 0 ? `${fieldId}-correct` : undefined}
                type="radio"
                name={`answer-${question.id}`}
                value={value}
                checked={question.correctAnswer === value}
                aria-invalid={isInvalid("correctAnswer")}
                aria-describedby={
                  isInvalid("correctAnswer") ? errorId : undefined
                }
                onChange={() => onChange({ ...question, correctAnswer: value })}
              />
              {value}
            </label>
          ))}
        </fieldset>
      )}
      {question.type === "open" && (
        <div className="open-answer-info">
          <span className="badge amber">Correção manual</span>
          <p className="muted">
            A resposta será corrigida pelo professor na área de resultados.
          </p>
        </div>
      )}
      {error && (
        <p id={errorId} className="field-error" role="alert">
          {error}
        </p>
      )}
    </article>
  );
}
