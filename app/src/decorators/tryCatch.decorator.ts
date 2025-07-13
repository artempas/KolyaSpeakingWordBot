export default function TryCatchLogger({reThrowError}: {reThrowError: boolean} = {reThrowError: false}) {
    return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {

        if (!descriptor?.value) return;
        const originalMethod = descriptor.value;

        if (originalMethod instanceof Function) {
            descriptor.value = async function(...args: any[]) {
                try {
                    const result = originalMethod.apply(this, args);

                    if (result instanceof Promise) {
                        return await result;
                    }
                    return result;
                } catch (error) {
                    console.error({
                        message: (error as Error).message,
                        data: {
                            function_name: originalMethod.name
                        },
                        error: (error as Error).stack,
                    });
                    if (reThrowError)
                        throw error; // Re-throw the error if needed
                }
            };
        }
        return descriptor;


    };
}