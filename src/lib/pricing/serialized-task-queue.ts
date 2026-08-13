/**
 * Ejecuta tareas asíncronas en orden. Una falla no rompe la cola de tareas
 * posteriores, que pueden reconciliar o reintentar la intención pendiente.
 */
export class SerializedTaskQueue {
  private tail: Promise<void> = Promise.resolve();

  enqueue<Result>(task: () => Promise<Result>): Promise<Result> {
    const result = this.tail.then(task, task);
    this.tail = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }
}
