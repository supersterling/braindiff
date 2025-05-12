export type Success<T> = {
	data: T
	error: undefined
}

export type Failure<E> = {
	data: undefined
	error: E
}

export type Result<T, E = Error> = Success<T> | Failure<E>

export async function tryCatch<T, E extends Error = Error>(
	promise: Promise<T>
): Promise<Result<T, E>> {
	try {
		const data = await promise
		return { data, error: undefined }
	} catch (error) {
		const finalError = error as E
		return { data: undefined, error: finalError }
	}
}

export function trySync<T, E extends Error = Error>(fn: () => T): Result<T, E> {
	try {
		const data = fn()
		return { data, error: undefined }
	} catch (error) {
		const finalError = error as E
		return { data: undefined, error: finalError }
	}
}

export class WrappedError<E extends Error = Error> extends Error {
	cause: E

	constructor(message: string, cause: E) {
		super(message)
		this.name = "WrappedError"
		this.cause = cause

		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, WrappedError)
		}
	}

	unwrap(): E {
		return this.cause
	}

	toString(): string {
		return `${this.message}: ${this.cause.toString()}`
	}

	static cause(error: Error): Error {
		let result = error
		while (
			"cause" in result &&
			result.cause != null &&
			result.cause instanceof Error
		) {
			result = result.cause
		}
		return result
	}
}

export function wrap<E extends Error>(
	cause: E,
	message: string
): WrappedError<E> {
	return new WrappedError(message, cause)
}

export const Errors = Object.freeze({
	try: tryCatch,
	trySync,
	wrap,
	WrappedError
})
