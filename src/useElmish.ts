import { Cmd, Dispatch } from "./Cmd";
import { dispatchMiddleware, LoggerService } from "./Init";
import { InitFunction, UpdateFunction, UpdateReturnType } from "./ElmComponent";
import { MessageBase, Nullable, UpdateMap } from "./ElmUtilities";
import { useCallback, useEffect, useState } from "react";

export type SubscriptionResult<TMessage> = [Cmd<TMessage>, (() => void)?];
type Subscription<TModel, TMessage> = (model: TModel) => SubscriptionResult<TMessage>;

interface UseElmishOptions<TProps, TModel, TMessage extends MessageBase> {
    name: string,
    props: TProps,
    init: InitFunction<TProps, TModel, TMessage>,
    update: UpdateFunction<TProps, TModel, TMessage> | UpdateMap<TProps, TModel, TMessage>,
    subscription?: Subscription<TModel, TMessage>,
}

/**
 * Hook to use the Elm architecture pattern in a function component.
 * @param {UseElmishOptions} options The options passed the the hook.
 * @returns A tuple containing the current model and the dispatcher.
 * @example
 * const [model, dispatch] = useElmish({ props, init, update, name: "MyComponent" });
 */
export function useElmish<TProps, TModel, TMessage extends MessageBase> ({ name, props, init, update, subscription }: UseElmishOptions<TProps, TModel, TMessage>): [TModel, Dispatch<TMessage>] {
    let reentered = false;
    const buffer: TMessage [] = [];
    let currentModel: Partial<TModel> = {};

    const [model, setModel] = useState<Nullable<TModel>>(null);
    let initializedModel = model;

    const execCmd = useCallback((cmd: Cmd<TMessage>): void => {
        cmd.forEach(call => {
            try {
                call(dispatch);
            } catch (ex: unknown) {
                LoggerService?.error(ex);
            }
        });
    }, []);

    const dispatch = useCallback((msg: TMessage): void => {
        if (!initializedModel) {
            return;
        }

        const modelHasChanged = (updatedModel: Partial<TModel>): boolean => updatedModel !== initializedModel && Object.getOwnPropertyNames(updatedModel).length > 0;

        if (dispatchMiddleware) {
            dispatchMiddleware(msg);
        }

        if (reentered) {
            buffer.push(msg);
        } else {
            reentered = true;

            let nextMsg: TMessage | undefined = msg;
            let modified = false;

            while (nextMsg) {
                LoggerService?.info("Elm", "message from", name, nextMsg.name);
                LoggerService?.debug("Elm", "message from", name, nextMsg);

                try {
                    const [newModel, cmd] = callUpdate(update, nextMsg, { ...initializedModel, ...currentModel }, props);

                    if (modelHasChanged(newModel)) {
                        currentModel = { ...currentModel, ...newModel };

                        modified = true;
                    }

                    if (cmd) {
                        execCmd(cmd);
                    }
                } catch (ex: unknown) {
                    LoggerService?.error(ex);
                }

                nextMsg = buffer.shift();
            }
            reentered = false;

            if (modified) {
                setModel(prevModel => {
                    const updatedModel = { ...prevModel as TModel, ...currentModel };

                    LoggerService?.debug("Elm", "update model for", name, updatedModel);

                    return updatedModel;
                });
            }
        }
    }, []);

    if (!initializedModel) {
        const [initModel, initCmd] = init(props);

        initializedModel = initModel;
        setModel(initializedModel);

        if (initCmd) {
            execCmd(initCmd);
        }
    }

    useEffect(() => {
        if (subscription) {
            const [subCmd, destructor] = subscription(initializedModel as TModel);

            execCmd(subCmd);

            if (destructor) {
                return destructor;
            }
        }
    }, []);

    return [initializedModel, dispatch];
}

export function callUpdate<TProps, TModel, TMessage extends MessageBase> (update: UpdateFunction<TProps, TModel, TMessage> | UpdateMap<TProps, TModel, TMessage>, msg: TMessage, model: TModel, props: TProps): UpdateReturnType<TModel, TMessage> {
    if (typeof update === "function") {
        return update(model, msg, props);
    }

    return callUpdateMap(update, msg, model, props);
}

export function callUpdateMap<TProps, TModel, TMessage extends MessageBase> (updateMap: UpdateMap<TProps, TModel, TMessage>, msg: TMessage, model: TModel, props: TProps): UpdateReturnType<TModel, TMessage> {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error -- We know that nextMsg fits
    return updateMap[msg.name as TMessage["name"]](msg, model, props);
}