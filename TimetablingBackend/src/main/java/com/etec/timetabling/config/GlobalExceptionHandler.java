package com.etec.timetabling.config;

import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.LinkedHashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    public record ApiErrorResponse(
        int status,
        String error,
        String message,
        String timestamp,
        Map<String, String> validationErrors
    ) {}

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ApiErrorResponse> handleResponseStatus(ResponseStatusException ex) {
        int code = ex.getStatusCode().value();
        HttpStatus status = HttpStatus.resolve(code);
        String errorName = status != null ? status.getReasonPhrase() : "Error";
        String msg = ex.getReason() != null ? ex.getReason() : errorName;
        return ResponseEntity.status(ex.getStatusCode()).body(
            new ApiErrorResponse(code, errorName, msg, Instant.now().toString(), null)
        );
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiErrorResponse> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> fieldErrors = new LinkedHashMap<>();
        for (FieldError fe : ex.getBindingResult().getFieldErrors()) {
            fieldErrors.put(fe.getField(), fe.getDefaultMessage());
        }
        String summary = fieldErrors.isEmpty()
            ? "Dados de entrada invalidos"
            : "Erro de validacao nos campos: " + String.join(", ", fieldErrors.keySet());
        return ResponseEntity.badRequest().body(
            new ApiErrorResponse(400, "Bad Request", summary, Instant.now().toString(), fieldErrors)
        );
    }

    @ExceptionHandler({
        HttpMessageNotReadableException.class,
        DateTimeParseException.class,
        MethodArgumentTypeMismatchException.class,
        IllegalArgumentException.class
    })
    public ResponseEntity<ApiErrorResponse> handleBadInput(Exception ex) {
        return ResponseEntity.badRequest().body(
            new ApiErrorResponse(400, "Bad Request", "Formato de requisicao ou parametro invalido", Instant.now().toString(), null)
        );
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiErrorResponse> handleDataIntegrity(DataIntegrityViolationException ex) {
        log.warn("Violacao de integridade no banco de dados: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT).body(
            new ApiErrorResponse(409, "Conflict", "Operacao viola restricao de unicidade ou integridade referencial", Instant.now().toString(), null)
        );
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ApiErrorResponse> handleNoResource(NoResourceFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(
            new ApiErrorResponse(404, "Not Found", "Recurso nao encontrado", Instant.now().toString(), null)
        );
    }

    @ExceptionHandler(org.springframework.web.HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ApiErrorResponse> handleMethodNotAllowed(
        org.springframework.web.HttpRequestMethodNotSupportedException ex
    ) {
        String supported = ex.getSupportedHttpMethods() == null
            ? ""
            : " Permitidos: " + ex.getSupportedHttpMethods();
        return ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED).body(
            new ApiErrorResponse(
                405,
                "Method Not Allowed",
                "Metodo HTTP nao suportado para esta rota." + supported,
                Instant.now().toString(),
                null
            )
        );
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiErrorResponse> handleUnexpected(Exception ex) {
        log.error("Erro inesperado processando requisicao", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(
            new ApiErrorResponse(500, "Internal Server Error", "Erro interno no servidor", Instant.now().toString(), null)
        );
    }
}
