import { InitFunction, Message } from "../Types";
import { createModelAndProps } from "./createModelAndProps";
import { ModelAndPropsFactory, UpdateArgsFactory } from "./createUpdateArgsFactory";

/**
 * Creates a factory function to create a message, a model, and props which can be passed to an update function in tests.
 * @param {InitFunction<TProps, TModel, TMessage>} init The init function which creates the model.
 * @param {() => TProps} initProps A function to create initial props.
 * @returns {UpdateArgsFactory<TProps, TModel, TMessage>} A function to create a message, a model, and props.
 * @example
 * // one time
 * const createUpdateArgs = getCreateUpdateArgs(init, () => ({ ... }));
 * // in tests
 * const [msg, model, props] = createUpdateArgs(Msg.myMessage(), { ... }, , { ... });
 */
function getCreateUpdateArgs<TProps, TModel, TMessage extends Message>(
	init: InitFunction<TProps, TModel, TMessage>,
	initProps: () => TProps,
): UpdateArgsFactory<TProps, TModel, TMessage> {
	return function createUpdateArgs(
		msg: TMessage,
		modelTemplate?: Partial<TModel>,
		propsTemplate?: Partial<TProps>,
	): [TMessage, TModel, TProps] {
		return [msg, ...createModelAndProps(init, initProps, modelTemplate, propsTemplate)];
	};
}

/**
 * Creates a factory function to create a model, and props which can be passed to an update or subscription function in tests.
 * @param {InitFunction<TProps, TModel, TMessage>} init The init function which creates the model.
 * @param {() => TProps} initProps A function to create initial props.
 * @returns {ModelAndPropsFactory<TProps, TModel>} A function to create a a model and props.
 * @example
 * // one time
 * const createModelAndProps = getCreateModelAndProps(init, () => ({ ... }));
 * // in tests
 * const [model, props] = createModelAndProps({ ... }, , { ... });
 */
function getCreateModelAndProps<TProps, TModel, TMessage extends Message>(
	init: InitFunction<TProps, TModel, TMessage>,
	initProps: () => TProps,
): ModelAndPropsFactory<TProps, TModel> {
	return function create(modelTemplate?: Partial<TModel>, propsTemplate?: Partial<TProps>): [TModel, TProps] {
		return createModelAndProps(init, initProps, modelTemplate, propsTemplate);
	};
}

export { getCreateModelAndProps, getCreateUpdateArgs };
