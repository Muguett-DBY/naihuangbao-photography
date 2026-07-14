type StandardDisposable = {
  dispose(): void;
};

type RegisteredResource = {
  resource: object;
  dispose(): void;
};

function hasStandardDisposer(resource: object): resource is StandardDisposable {
  return "dispose" in resource && typeof resource.dispose === "function";
}

export class ResourceRegistry {
  private readonly resources = new Set<object>();
  private readonly registrations: RegisteredResource[] = [];

  get size(): number {
    return this.registrations.length;
  }

  register<T extends object>(resource: T, disposer?: (resource: T) => void): T {
    if (this.resources.has(resource)) return resource;

    const dispose = disposer
      ? () => disposer(resource)
      : hasStandardDisposer(resource)
        ? () => resource.dispose()
        : null;

    if (!dispose) throw new TypeError("Resource requires a dispose() method or disposer callback.");

    this.resources.add(resource);
    this.registrations.push({ resource, dispose });
    return resource;
  }

  dispose(): void {
    const registrations = this.registrations.splice(0).reverse();
    this.resources.clear();
    const errors: unknown[] = [];

    for (const registration of registrations) {
      try {
        registration.dispose();
      } catch (error) {
        errors.push(error);
      }
    }

    if (errors.length > 0) throw new AggregateError(errors, "Failed to dispose one or more resources.");
  }
}
