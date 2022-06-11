
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':55555/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        if (value != null || input.value) {
            input.value = value;
        }
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.22.2' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev("SvelteDOMSetProperty", { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src\Bank.svelte generated by Svelte v3.22.2 */

    const file = "src\\Bank.svelte";

    function create_fragment(ctx) {
    	let div1;
    	let div0;
    	let t;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			t = text(/*money*/ ctx[0]);
    			add_location(div0, file, 9, 2, 122);
    			attr_dev(div1, "class", "bank svelte-txgptf");
    			add_location(div1, file, 8, 0, 100);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, t);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*money*/ 1) set_data_dev(t, /*money*/ ctx[0]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { money = 0 } = $$props;
    	const writable_props = ["money"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Bank> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Bank", $$slots, []);

    	$$self.$set = $$props => {
    		if ("money" in $$props) $$invalidate(0, money = $$props.money);
    	};

    	$$self.$capture_state = () => ({ money });

    	$$self.$inject_state = $$props => {
    		if ("money" in $$props) $$invalidate(0, money = $$props.money);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [money];
    }

    class Bank extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { money: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Bank",
    			options,
    			id: create_fragment.name
    		});
    	}

    	get money() {
    		throw new Error("<Bank>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set money(value) {
    		throw new Error("<Bank>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\Team.svelte generated by Svelte v3.22.2 */

    const file$1 = "src\\Team.svelte";

    function create_fragment$1(ctx) {
    	let div;
    	let t;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t = text(/*money*/ ctx[0]);
    			attr_dev(div, "class", "team svelte-ffus0x");
    			add_location(div, file$1, 21, 0, 297);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*money*/ 1) set_data_dev(t, /*money*/ ctx[0]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { money = 0 } = $$props;
    	const writable_props = ["money"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Team> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Team", $$slots, []);

    	$$self.$set = $$props => {
    		if ("money" in $$props) $$invalidate(0, money = $$props.money);
    	};

    	$$self.$capture_state = () => ({ money });

    	$$self.$inject_state = $$props => {
    		if ("money" in $$props) $$invalidate(0, money = $$props.money);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [money];
    }

    class Team extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { money: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Team",
    			options,
    			id: create_fragment$1.name
    		});
    	}

    	get money() {
    		throw new Error("<Team>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set money(value) {
    		throw new Error("<Team>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\Question.svelte generated by Svelte v3.22.2 */

    const file$2 = "src\\Question.svelte";

    function create_fragment$2(ctx) {
    	let div;
    	let p;
    	let t;

    	const block = {
    		c: function create() {
    			div = element("div");
    			p = element("p");
    			t = text(/*question*/ ctx[0]);
    			add_location(p, file$2, 24, 2, 391);
    			attr_dev(div, "class", "question svelte-16aasz2");
    			add_location(div, file$2, 23, 0, 365);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, p);
    			append_dev(p, t);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*question*/ 1) set_data_dev(t, /*question*/ ctx[0]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { question } = $$props;
    	const writable_props = ["question"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Question> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Question", $$slots, []);

    	$$self.$set = $$props => {
    		if ("question" in $$props) $$invalidate(0, question = $$props.question);
    	};

    	$$self.$capture_state = () => ({ question });

    	$$self.$inject_state = $$props => {
    		if ("question" in $$props) $$invalidate(0, question = $$props.question);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [question];
    }

    class Question extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { question: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Question",
    			options,
    			id: create_fragment$2.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*question*/ ctx[0] === undefined && !("question" in props)) {
    			console.warn("<Question> was created without expected prop 'question'");
    		}
    	}

    	get question() {
    		throw new Error("<Question>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set question(value) {
    		throw new Error("<Question>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\Answer.svelte generated by Svelte v3.22.2 */

    const file$3 = "src\\Answer.svelte";

    // (17:2) {:else}
    function create_else_block(ctx) {
    	let div0;
    	let t1;
    	let div1;

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			div0.textContent = " ";
    			t1 = space();
    			div1 = element("div");
    			div1.textContent = " ";
    			add_location(div0, file$3, 17, 4, 284);
    			add_location(div1, file$3, 18, 4, 307);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div1, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(17:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (10:2) {#if answer.show}
    function create_if_block(ctx) {
    	let div0;
    	let t0_value = /*answer*/ ctx[0].text + "";
    	let t0;
    	let t1;
    	let div1;
    	let t2_value = /*answer*/ ctx[0].money + "";
    	let t2;

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			t0 = text(t0_value);
    			t1 = space();
    			div1 = element("div");
    			t2 = text(t2_value);
    			add_location(div0, file$3, 10, 4, 184);
    			add_location(div1, file$3, 13, 4, 228);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			append_dev(div0, t0);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*answer*/ 1 && t0_value !== (t0_value = /*answer*/ ctx[0].text + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*answer*/ 1 && t2_value !== (t2_value = /*answer*/ ctx[0].money + "")) set_data_dev(t2, t2_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(10:2) {#if answer.show}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let div;
    	let div_class_value;

    	function select_block_type(ctx, dirty) {
    		if (/*answer*/ ctx[0].show) return create_if_block;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if_block.c();
    			attr_dev(div, "class", div_class_value = "answer " + (/*answer*/ ctx[0].show ? "answer-animation" : "") + " svelte-99b2z6");
    			add_location(div, file$3, 8, 0, 97);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			if_block.m(div, null);
    		},
    		p: function update(ctx, [dirty]) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(div, null);
    				}
    			}

    			if (dirty & /*answer*/ 1 && div_class_value !== (div_class_value = "answer " + (/*answer*/ ctx[0].show ? "answer-animation" : "") + " svelte-99b2z6")) {
    				attr_dev(div, "class", div_class_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { answer } = $$props;
    	const writable_props = ["answer"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Answer> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Answer", $$slots, []);

    	$$self.$set = $$props => {
    		if ("answer" in $$props) $$invalidate(0, answer = $$props.answer);
    	};

    	$$self.$capture_state = () => ({ answer });

    	$$self.$inject_state = $$props => {
    		if ("answer" in $$props) $$invalidate(0, answer = $$props.answer);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [answer];
    }

    class Answer extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { answer: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Answer",
    			options,
    			id: create_fragment$3.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*answer*/ ctx[0] === undefined && !("answer" in props)) {
    			console.warn("<Answer> was created without expected prop 'answer'");
    		}
    	}

    	get answer() {
    		throw new Error("<Answer>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set answer(value) {
    		throw new Error("<Answer>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\Board.svelte generated by Svelte v3.22.2 */
    const file$4 = "src\\Board.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[5] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[8] = list[i];
    	return child_ctx;
    }

    // (32:8) {#each answers as answer}
    function create_each_block_1(ctx) {
    	let current;

    	const answer = new Answer({
    			props: { answer: /*answer*/ ctx[8] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(answer.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(answer, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const answer_changes = {};
    			if (dirty & /*answers*/ 16) answer_changes.answer = /*answer*/ ctx[8];
    			answer.$set(answer_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(answer.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(answer.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(answer, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(32:8) {#each answers as answer}",
    		ctx
    	});

    	return block;
    }

    // (42:10) {:else}
    function create_else_block$1(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "☐";
    			attr_dev(div, "class", "strike strike-hidden svelte-3kv8o0");
    			add_location(div, file$4, 42, 12, 1041);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$1.name,
    		type: "else",
    		source: "(42:10) {:else}",
    		ctx
    	});

    	return block;
    }

    // (38:10) {#each strikes as strike}
    function create_each_block(ctx) {
    	let div;
    	let t0_value = /*strike*/ ctx[5] + "";
    	let t0;
    	let t1;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t0 = text(t0_value);
    			t1 = space();
    			attr_dev(div, "class", "strike svelte-3kv8o0");
    			add_location(div, file$4, 38, 12, 944);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t0);
    			append_dev(div, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*strikes*/ 8 && t0_value !== (t0_value = /*strike*/ ctx[5] + "")) set_data_dev(t0, t0_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(38:10) {#each strikes as strike}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$4(ctx) {
    	let div9;
    	let div8;
    	let div0;
    	let t0;
    	let div6;
    	let div1;
    	let t1;
    	let div2;
    	let t2;
    	let div3;
    	let t3;
    	let div5;
    	let div4;
    	let t4;
    	let div7;
    	let current;

    	const team0 = new Team({
    			props: { money: /*teamMoney*/ ctx[2][0] },
    			$$inline: true
    		});

    	const bank = new Bank({
    			props: { money: /*bankMoney*/ ctx[1] },
    			$$inline: true
    		});

    	const question = new Question({
    			props: { question: /*qa*/ ctx[0].question },
    			$$inline: true
    		});

    	let each_value_1 = /*answers*/ ctx[4];
    	validate_each_argument(each_value_1);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	const out = i => transition_out(each_blocks_1[i], 1, 1, () => {
    		each_blocks_1[i] = null;
    	});

    	let each_value = /*strikes*/ ctx[3];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	let each1_else = null;

    	if (!each_value.length) {
    		each1_else = create_else_block$1(ctx);
    	}

    	const team1 = new Team({
    			props: { money: /*teamMoney*/ ctx[2][1] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div9 = element("div");
    			div8 = element("div");
    			div0 = element("div");
    			create_component(team0.$$.fragment);
    			t0 = space();
    			div6 = element("div");
    			div1 = element("div");
    			create_component(bank.$$.fragment);
    			t1 = space();
    			div2 = element("div");
    			create_component(question.$$.fragment);
    			t2 = space();
    			div3 = element("div");

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t3 = space();
    			div5 = element("div");
    			div4 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			if (each1_else) {
    				each1_else.c();
    			}

    			t4 = space();
    			div7 = element("div");
    			create_component(team1.$$.fragment);
    			add_location(div0, file$4, 20, 4, 445);
    			attr_dev(div1, "class", "row-center svelte-3kv8o0");
    			add_location(div1, file$4, 24, 6, 539);
    			attr_dev(div2, "class", "row-center svelte-3kv8o0");
    			add_location(div2, file$4, 27, 6, 621);
    			attr_dev(div3, "class", "answers svelte-3kv8o0");
    			add_location(div3, file$4, 30, 6, 712);
    			attr_dev(div4, "class", "strikes svelte-3kv8o0");
    			add_location(div4, file$4, 36, 8, 872);
    			attr_dev(div5, "class", "row-center svelte-3kv8o0");
    			add_location(div5, file$4, 35, 6, 838);
    			attr_dev(div6, "class", "board-middle svelte-3kv8o0");
    			add_location(div6, file$4, 23, 4, 505);
    			add_location(div7, file$4, 47, 4, 1149);
    			attr_dev(div8, "class", "board svelte-3kv8o0");
    			add_location(div8, file$4, 19, 2, 420);
    			attr_dev(div9, "id", "board");
    			attr_dev(div9, "class", "board-container svelte-3kv8o0");
    			add_location(div9, file$4, 18, 0, 376);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div9, anchor);
    			append_dev(div9, div8);
    			append_dev(div8, div0);
    			mount_component(team0, div0, null);
    			append_dev(div8, t0);
    			append_dev(div8, div6);
    			append_dev(div6, div1);
    			mount_component(bank, div1, null);
    			append_dev(div6, t1);
    			append_dev(div6, div2);
    			mount_component(question, div2, null);
    			append_dev(div6, t2);
    			append_dev(div6, div3);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(div3, null);
    			}

    			append_dev(div6, t3);
    			append_dev(div6, div5);
    			append_dev(div5, div4);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div4, null);
    			}

    			if (each1_else) {
    				each1_else.m(div4, null);
    			}

    			append_dev(div8, t4);
    			append_dev(div8, div7);
    			mount_component(team1, div7, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const team0_changes = {};
    			if (dirty & /*teamMoney*/ 4) team0_changes.money = /*teamMoney*/ ctx[2][0];
    			team0.$set(team0_changes);
    			const bank_changes = {};
    			if (dirty & /*bankMoney*/ 2) bank_changes.money = /*bankMoney*/ ctx[1];
    			bank.$set(bank_changes);
    			const question_changes = {};
    			if (dirty & /*qa*/ 1) question_changes.question = /*qa*/ ctx[0].question;
    			question.$set(question_changes);

    			if (dirty & /*answers*/ 16) {
    				each_value_1 = /*answers*/ ctx[4];
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    						transition_in(each_blocks_1[i], 1);
    					} else {
    						each_blocks_1[i] = create_each_block_1(child_ctx);
    						each_blocks_1[i].c();
    						transition_in(each_blocks_1[i], 1);
    						each_blocks_1[i].m(div3, null);
    					}
    				}

    				group_outros();

    				for (i = each_value_1.length; i < each_blocks_1.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}

    			if (dirty & /*strikes*/ 8) {
    				each_value = /*strikes*/ ctx[3];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div4, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;

    				if (each_value.length) {
    					if (each1_else) {
    						each1_else.d(1);
    						each1_else = null;
    					}
    				} else if (!each1_else) {
    					each1_else = create_else_block$1(ctx);
    					each1_else.c();
    					each1_else.m(div4, null);
    				}
    			}

    			const team1_changes = {};
    			if (dirty & /*teamMoney*/ 4) team1_changes.money = /*teamMoney*/ ctx[2][1];
    			team1.$set(team1_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(team0.$$.fragment, local);
    			transition_in(bank.$$.fragment, local);
    			transition_in(question.$$.fragment, local);

    			for (let i = 0; i < each_value_1.length; i += 1) {
    				transition_in(each_blocks_1[i]);
    			}

    			transition_in(team1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(team0.$$.fragment, local);
    			transition_out(bank.$$.fragment, local);
    			transition_out(question.$$.fragment, local);
    			each_blocks_1 = each_blocks_1.filter(Boolean);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				transition_out(each_blocks_1[i]);
    			}

    			transition_out(team1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div9);
    			destroy_component(team0);
    			destroy_component(bank);
    			destroy_component(question);
    			destroy_each(each_blocks_1, detaching);
    			destroy_each(each_blocks, detaching);
    			if (each1_else) each1_else.d();
    			destroy_component(team1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { qa } = $$props;
    	let { bankMoney = 0 } = $$props;
    	let { teamMoney = [0, 0] } = $$props;
    	let { strikes = [] } = $$props;
    	const writable_props = ["qa", "bankMoney", "teamMoney", "strikes"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Board> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Board", $$slots, []);

    	$$self.$set = $$props => {
    		if ("qa" in $$props) $$invalidate(0, qa = $$props.qa);
    		if ("bankMoney" in $$props) $$invalidate(1, bankMoney = $$props.bankMoney);
    		if ("teamMoney" in $$props) $$invalidate(2, teamMoney = $$props.teamMoney);
    		if ("strikes" in $$props) $$invalidate(3, strikes = $$props.strikes);
    	};

    	$$self.$capture_state = () => ({
    		Bank,
    		Team,
    		Question,
    		Answer,
    		qa,
    		bankMoney,
    		teamMoney,
    		strikes,
    		answers
    	});

    	$$self.$inject_state = $$props => {
    		if ("qa" in $$props) $$invalidate(0, qa = $$props.qa);
    		if ("bankMoney" in $$props) $$invalidate(1, bankMoney = $$props.bankMoney);
    		if ("teamMoney" in $$props) $$invalidate(2, teamMoney = $$props.teamMoney);
    		if ("strikes" in $$props) $$invalidate(3, strikes = $$props.strikes);
    		if ("answers" in $$props) $$invalidate(4, answers = $$props.answers);
    	};

    	let answers;

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*qa*/ 1) {
    			 $$invalidate(4, answers = qa.answers);
    		}
    	};

    	return [qa, bankMoney, teamMoney, strikes, answers];
    }

    class Board extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {
    			qa: 0,
    			bankMoney: 1,
    			teamMoney: 2,
    			strikes: 3
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Board",
    			options,
    			id: create_fragment$4.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*qa*/ ctx[0] === undefined && !("qa" in props)) {
    			console.warn("<Board> was created without expected prop 'qa'");
    		}
    	}

    	get qa() {
    		throw new Error("<Board>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set qa(value) {
    		throw new Error("<Board>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get bankMoney() {
    		throw new Error("<Board>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set bankMoney(value) {
    		throw new Error("<Board>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get teamMoney() {
    		throw new Error("<Board>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set teamMoney(value) {
    		throw new Error("<Board>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get strikes() {
    		throw new Error("<Board>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set strikes(value) {
    		throw new Error("<Board>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\Guess.svelte generated by Svelte v3.22.2 */
    const file$5 = "src\\Guess.svelte";

    // (62:4) {:else}
    function create_else_block$2(ctx) {
    	let input;
    	let t0;
    	let button;
    	let span;
    	let dispose;

    	const block = {
    		c: function create() {
    			input = element("input");
    			t0 = space();
    			button = element("button");
    			span = element("span");
    			span.textContent = "Submit";
    			input.autofocus = true;
    			add_location(input, file$5, 62, 6, 1352);
    			add_location(span, file$5, 63, 72, 1520);
    			attr_dev(button, "class", "margin-left button-animation svelte-kl4rg9");
    			add_location(button, file$5, 63, 6, 1454);
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, input, anchor);
    			set_input_value(input, /*guess*/ ctx[3]);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, button, anchor);
    			append_dev(button, span);
    			input.focus();
    			if (remount) run_all(dispose);

    			dispose = [
    				listen_dev(input, "input", /*input_input_handler*/ ctx[8]),
    				listen_dev(input, "keyup", /*keyup_handler*/ ctx[9], false, false, false),
    				listen_dev(button, "click", /*sendGuess*/ ctx[4], false, false, false)
    			];
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*guess*/ 8 && input.value !== /*guess*/ ctx[3]) {
    				set_input_value(input, /*guess*/ ctx[3]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(input);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(button);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$2.name,
    		type: "else",
    		source: "(62:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (57:4) {#if !show || disable}
    function create_if_block$1(ctx) {
    	let input;
    	let input_disabled_value;
    	let t0;
    	let button;
    	let span;
    	let button_class_value;
    	let dispose;

    	const block = {
    		c: function create() {
    			input = element("input");
    			t0 = space();
    			button = element("button");
    			span = element("span");
    			span.textContent = "Guess";
    			set_style(input, "cursor", /*disable*/ ctx[0] ? "not-allowed" : "pointer");
    			input.value = /*teamName*/ ctx[1];
    			input.disabled = input_disabled_value = /*disable*/ ctx[0] ? "true" : "";
    			add_location(input, file$5, 57, 6, 1003);
    			add_location(span, file$5, 60, 64, 1304);
    			attr_dev(button, "class", button_class_value = "margin-left " + (!/*disable*/ ctx[0] ? "button-animation" : "") + " svelte-kl4rg9");
    			button.disabled = /*disable*/ ctx[0];
    			add_location(button, file$5, 59, 6, 1172);
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, input, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, button, anchor);
    			append_dev(button, span);
    			if (remount) run_all(dispose);

    			dispose = [
    				listen_dev(input, "click", /*click_handler*/ ctx[6], false, false, false),
    				listen_dev(button, "click", /*click_handler_1*/ ctx[7], false, false, false)
    			];
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*disable*/ 1) {
    				set_style(input, "cursor", /*disable*/ ctx[0] ? "not-allowed" : "pointer");
    			}

    			if (dirty & /*teamName*/ 2 && input.value !== /*teamName*/ ctx[1]) {
    				prop_dev(input, "value", /*teamName*/ ctx[1]);
    			}

    			if (dirty & /*disable*/ 1 && input_disabled_value !== (input_disabled_value = /*disable*/ ctx[0] ? "true" : "")) {
    				prop_dev(input, "disabled", input_disabled_value);
    			}

    			if (dirty & /*disable*/ 1 && button_class_value !== (button_class_value = "margin-left " + (!/*disable*/ ctx[0] ? "button-animation" : "") + " svelte-kl4rg9")) {
    				attr_dev(button, "class", button_class_value);
    			}

    			if (dirty & /*disable*/ 1) {
    				prop_dev(button, "disabled", /*disable*/ ctx[0]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(input);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(button);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(57:4) {#if !show || disable}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$5(ctx) {
    	let div2;
    	let div0;
    	let t1;
    	let div1;

    	function select_block_type(ctx, dirty) {
    		if (!/*show*/ ctx[2] || /*disable*/ ctx[0]) return create_if_block$1;
    		return create_else_block$2;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			div0.textContent = "TEAM";
    			t1 = space();
    			div1 = element("div");
    			if_block.c();
    			attr_dev(div0, "class", "team-text svelte-kl4rg9");
    			add_location(div0, file$5, 52, 2, 891);
    			attr_dev(div1, "class", "input-container svelte-kl4rg9");
    			add_location(div1, file$5, 55, 2, 938);
    			attr_dev(div2, "class", "container svelte-kl4rg9");
    			add_location(div2, file$5, 51, 0, 864);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div2, t1);
    			append_dev(div2, div1);
    			if_block.m(div1, null);
    		},
    		p: function update(ctx, [dirty]) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(div1, null);
    				}
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	const dispatch = createEventDispatcher();
    	let { disable = false } = $$props;
    	let { teamName = "" } = $$props;
    	let show = false;
    	let guess = "";

    	function sendGuess(e) {
    		dispatch("guess", String(guess).trim());
    		$$invalidate(2, show = false);
    		$$invalidate(3, guess = "");
    	}

    	const writable_props = ["disable", "teamName"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Guess> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Guess", $$slots, []);
    	const click_handler = e => $$invalidate(2, show = true);
    	const click_handler_1 = e => $$invalidate(2, show = true);

    	function input_input_handler() {
    		guess = this.value;
    		$$invalidate(3, guess);
    	}

    	const keyup_handler = e => {
    		if (e.keyCode == 13) sendGuess();
    	};

    	$$self.$set = $$props => {
    		if ("disable" in $$props) $$invalidate(0, disable = $$props.disable);
    		if ("teamName" in $$props) $$invalidate(1, teamName = $$props.teamName);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		dispatch,
    		disable,
    		teamName,
    		show,
    		guess,
    		sendGuess
    	});

    	$$self.$inject_state = $$props => {
    		if ("disable" in $$props) $$invalidate(0, disable = $$props.disable);
    		if ("teamName" in $$props) $$invalidate(1, teamName = $$props.teamName);
    		if ("show" in $$props) $$invalidate(2, show = $$props.show);
    		if ("guess" in $$props) $$invalidate(3, guess = $$props.guess);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		disable,
    		teamName,
    		show,
    		guess,
    		sendGuess,
    		dispatch,
    		click_handler,
    		click_handler_1,
    		input_input_handler,
    		keyup_handler
    	];
    }

    class Guess extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, { disable: 0, teamName: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Guess",
    			options,
    			id: create_fragment$5.name
    		});
    	}

    	get disable() {
    		throw new Error("<Guess>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set disable(value) {
    		throw new Error("<Guess>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get teamName() {
    		throw new Error("<Guess>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set teamName(value) {
    		throw new Error("<Guess>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\Function.svelte generated by Svelte v3.22.2 */

    function create_fragment$6(ctx) {
    	const block = {
    		c: noop,
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: noop,
    		p: noop,
    		i: noop,
    		o: noop,
    		d: noop
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function leveinsteinerDistance(a = "", b = "") {
    	if (a.length == 0) return b.length;
    	if (b.length == 0) return a.length;
    	var matrix = [];

    	// increment along the first column of each row
    	var i;

    	for (i = 0; i <= b.length; i++) {
    		matrix[i] = [i];
    	}

    	// increment each column in the first row
    	var j;

    	for (j = 0; j <= a.length; j++) {
    		matrix[0][j] = j;
    	}

    	// Fill in the rest of the matrix
    	for (i = 1; i <= b.length; i++) {
    		for (j = 1; j <= a.length; j++) {
    			if (b.charAt(i - 1) == a.charAt(j - 1)) {
    				matrix[i][j] = matrix[i - 1][j - 1];
    			} else {
    				matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)); // substitution
    				// insertion
    				// deletion
    			}
    		}
    	}

    	return matrix[b.length][a.length];
    }

    function instance$6($$self, $$props, $$invalidate) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Function> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Function", $$slots, []);
    	$$self.$capture_state = () => ({ leveinsteinerDistance });
    	return [leveinsteinerDistance];
    }

    class Function extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, { leveinsteinerDistance: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Function",
    			options,
    			id: create_fragment$6.name
    		});
    	}

    	get leveinsteinerDistance() {
    		return leveinsteinerDistance;
    	}

    	set leveinsteinerDistance(value) {
    		throw new Error("<Function>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\App.svelte generated by Svelte v3.22.2 */

    const { console: console_1 } = globals;
    const file$6 = "src\\App.svelte";

    // (302:0) {#if showMessage}
    function create_if_block_4(ctx) {
    	let div1;
    	let div0;
    	let t;
    	let dispose;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			t = text(/*message*/ ctx[10]);
    			attr_dev(div0, "class", "message-text svelte-5ub8ge");
    			add_location(div0, file$6, 303, 4, 6619);
    			attr_dev(div1, "class", "message svelte-5ub8ge");
    			add_location(div1, file$6, 302, 2, 6553);
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, t);
    			if (remount) dispose();
    			dispose = listen_dev(div1, "click", /*click_handler*/ ctx[29], false, false, false);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*message*/ 1024) set_data_dev(t, /*message*/ ctx[10]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(302:0) {#if showMessage}",
    		ctx
    	});

    	return block;
    }

    // (317:2) {:else}
    function create_else_block$3(ctx) {
    	let t;
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;

    	const board = new Board({
    			props: {
    				qa: /*qas*/ ctx[0][/*qaIndex*/ ctx[2]],
    				bankMoney: /*bankMoney*/ ctx[11],
    				teamMoney: /*teamMoney*/ ctx[12],
    				strikes: /*strikes*/ ctx[13]
    			},
    			$$inline: true
    		});

    	const if_block_creators = [create_if_block_1, create_if_block_2, create_else_block_1];
    	const if_blocks = [];

    	function select_block_type_1(ctx, dirty) {
    		if (/*end*/ ctx[9]) return 0;
    		if (/*next*/ ctx[8]) return 1;
    		return 2;
    	}

    	current_block_type_index = select_block_type_1(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			create_component(board.$$.fragment);
    			t = space();
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			mount_component(board, target, anchor);
    			insert_dev(target, t, anchor);
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const board_changes = {};
    			if (dirty[0] & /*qas, qaIndex*/ 5) board_changes.qa = /*qas*/ ctx[0][/*qaIndex*/ ctx[2]];
    			if (dirty[0] & /*bankMoney*/ 2048) board_changes.bankMoney = /*bankMoney*/ ctx[11];
    			if (dirty[0] & /*teamMoney*/ 4096) board_changes.teamMoney = /*teamMoney*/ ctx[12];
    			if (dirty[0] & /*strikes*/ 8192) board_changes.strikes = /*strikes*/ ctx[13];
    			board.$set(board_changes);
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type_1(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(board.$$.fragment, local);
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(board.$$.fragment, local);
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(board, detaching);
    			if (detaching) detach_dev(t);
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$3.name,
    		type: "else",
    		source: "(317:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (308:2) {#if !start}
    function create_if_block$2(ctx) {
    	let div2;
    	let div1;
    	let div0;
    	let t1;
    	let button;
    	let span;
    	let dispose;

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			div0.textContent = "Odin Feud";
    			t1 = space();
    			button = element("button");
    			span = element("span");
    			span.textContent = "Start";
    			attr_dev(div0, "class", "logo-text svelte-5ub8ge");
    			add_location(div0, file$6, 310, 8, 6813);
    			attr_dev(div1, "class", "logo logo-border-animation svelte-5ub8ge");
    			add_location(div1, file$6, 309, 6, 6763);
    			add_location(span, file$6, 313, 8, 6912);
    			add_location(button, file$6, 312, 6, 6873);
    			attr_dev(div2, "class", "column-center svelte-5ub8ge");
    			add_location(div2, file$6, 308, 4, 6728);
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			append_dev(div2, t1);
    			append_dev(div2, button);
    			append_dev(button, span);
    			if (remount) dispose();
    			dispose = listen_dev(button, "click", /*startGame*/ ctx[14], false, false, false);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(308:2) {#if !start}",
    		ctx
    	});

    	return block;
    }

    // (327:4) {:else}
    function create_else_block_1(ctx) {
    	let div;
    	let t0;
    	let t1;
    	let if_block_anchor;
    	let current;

    	const guess0 = new Guess({
    			props: {
    				disable: /*teamDisable*/ ctx[7][0],
    				teamName: /*teamNames*/ ctx[1][0]
    			},
    			$$inline: true
    		});

    	guess0.$on("guess", /*guess_handler*/ ctx[30]);

    	const guess1 = new Guess({
    			props: {
    				disable: /*teamDisable*/ ctx[7][1],
    				teamName: /*teamNames*/ ctx[1][1]
    			},
    			$$inline: true
    		});

    	guess1.$on("guess", /*guess_handler_1*/ ctx[31]);
    	let if_block = /*showPass*/ ctx[6] && create_if_block_3(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(guess0.$$.fragment);
    			t0 = space();
    			create_component(guess1.$$.fragment);
    			t1 = space();
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    			attr_dev(div, "class", "row-center svelte-5ub8ge");
    			add_location(div, file$6, 327, 6, 7331);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(guess0, div, null);
    			append_dev(div, t0);
    			mount_component(guess1, div, null);
    			insert_dev(target, t1, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const guess0_changes = {};
    			if (dirty[0] & /*teamDisable*/ 128) guess0_changes.disable = /*teamDisable*/ ctx[7][0];
    			if (dirty[0] & /*teamNames*/ 2) guess0_changes.teamName = /*teamNames*/ ctx[1][0];
    			guess0.$set(guess0_changes);
    			const guess1_changes = {};
    			if (dirty[0] & /*teamDisable*/ 128) guess1_changes.disable = /*teamDisable*/ ctx[7][1];
    			if (dirty[0] & /*teamNames*/ 2) guess1_changes.teamName = /*teamNames*/ ctx[1][1];
    			guess1.$set(guess1_changes);

    			if (/*showPass*/ ctx[6]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_3(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(guess0.$$.fragment, local);
    			transition_in(guess1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(guess0.$$.fragment, local);
    			transition_out(guess1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(guess0);
    			destroy_component(guess1);
    			if (detaching) detach_dev(t1);
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1.name,
    		type: "else",
    		source: "(327:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (323:19) 
    function create_if_block_2(ctx) {
    	let div;
    	let button;
    	let span1;
    	let t;
    	let span0;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			button = element("button");
    			span1 = element("span");
    			t = text("Next Round");
    			span0 = element("span");
    			add_location(span0, file$6, 324, 53, 7272);
    			add_location(span1, file$6, 324, 37, 7256);
    			add_location(button, file$6, 324, 8, 7227);
    			attr_dev(div, "class", "row-center svelte-5ub8ge");
    			add_location(div, file$6, 323, 6, 7193);
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, div, anchor);
    			append_dev(div, button);
    			append_dev(button, span1);
    			append_dev(span1, t);
    			append_dev(span1, span0);
    			if (remount) dispose();
    			dispose = listen_dev(button, "click", /*nextRound*/ ctx[17], false, false, false);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(323:19) ",
    		ctx
    	});

    	return block;
    }

    // (319:4) {#if end}
    function create_if_block_1(ctx) {
    	let div;
    	let button;
    	let span;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			button = element("button");
    			span = element("span");
    			span.textContent = "Restart";
    			add_location(span, file$6, 320, 35, 7121);
    			add_location(button, file$6, 320, 8, 7094);
    			attr_dev(div, "class", "row-center svelte-5ub8ge");
    			add_location(div, file$6, 319, 6, 7060);
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, div, anchor);
    			append_dev(div, button);
    			append_dev(button, span);
    			if (remount) dispose();
    			dispose = listen_dev(button, "click", /*restart*/ ctx[18], false, false, false);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(319:4) {#if end}",
    		ctx
    	});

    	return block;
    }

    // (346:6) {#if showPass}
    function create_if_block_3(ctx) {
    	let button;
    	let span1;
    	let t;
    	let span0;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			span1 = element("span");
    			t = text("Pass?");
    			span0 = element("span");
    			add_location(span0, file$6, 346, 43, 7842);
    			add_location(span1, file$6, 346, 32, 7831);
    			add_location(button, file$6, 346, 8, 7807);
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, button, anchor);
    			append_dev(button, span1);
    			append_dev(span1, t);
    			append_dev(span1, span0);
    			if (remount) dispose();
    			dispose = listen_dev(button, "click", /*pass*/ ctx[16], false, false, false);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(346:6) {#if showPass}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$7(ctx) {
    	let t0;
    	let t1;
    	let div;
    	let current_block_type_index;
    	let if_block1;
    	let current;
    	let function_1_props = {};
    	const function_1 = new Function({ props: function_1_props, $$inline: true });
    	/*function_1_binding*/ ctx[28](function_1);
    	let if_block0 = /*showMessage*/ ctx[4] && create_if_block_4(ctx);
    	const if_block_creators = [create_if_block$2, create_else_block$3];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (!/*start*/ ctx[5]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block1 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			create_component(function_1.$$.fragment);
    			t0 = space();
    			if (if_block0) if_block0.c();
    			t1 = space();
    			div = element("div");
    			if_block1.c();
    			attr_dev(div, "class", "column-center svelte-5ub8ge");
    			add_location(div, file$6, 306, 0, 6679);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(function_1, target, anchor);
    			insert_dev(target, t0, anchor);
    			if (if_block0) if_block0.m(target, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div, anchor);
    			if_blocks[current_block_type_index].m(div, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const function_1_changes = {};
    			function_1.$set(function_1_changes);

    			if (/*showMessage*/ ctx[4]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_4(ctx);
    					if_block0.c();
    					if_block0.m(t1.parentNode, t1);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block1 = if_blocks[current_block_type_index];

    				if (!if_block1) {
    					if_block1 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block1.c();
    				}

    				transition_in(if_block1, 1);
    				if_block1.m(div, null);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(function_1.$$.fragment, local);
    			transition_in(if_block1);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(function_1.$$.fragment, local);
    			transition_out(if_block1);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			/*function_1_binding*/ ctx[28](null);
    			destroy_component(function_1, detaching);
    			if (detaching) detach_dev(t0);
    			if (if_block0) if_block0.d(detaching);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div);
    			if_blocks[current_block_type_index].d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function playSound(name, volume) {
    	let sound = new Audio(`sounds/${name}.ogg`);
    	sound.volume = volume;
    	sound.play();
    }

    function setAnimation(on) {
    	let el = document.getElementById("board");

    	if (el) {
    		if (on) {
    			el.classList.add("logo-border-animation");
    		} else {
    			el.classList.remove("logo-border-animation");
    		}
    	}
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let { qas = [] } = $$props;
    	let { teamNames = ["", ""] } = $$props;
    	let { props = {} } = $$props;

    	onMount(async function () {
    		const proxyUrl = "https://young-gorge-proxy.herokuapp.com/";
    		const backendUrl = "https://intense-castle-46815.herokuapp.com/";
    		const response = await fetch(proxyUrl + backendUrl + "interest/jackal");
    		$$invalidate(19, props = await response.json());
    		console.log(props);
    	});

    	let qaIndex = 0;
    	let FunctionLib;
    	let showMessage = false;
    	let start = false;
    	let faceOff = false;
    	let showPass = false;
    	let teamDisable = [false, false];
    	let steal = false;
    	let next = false;
    	let end = false;
    	let messageTimeout = null;
    	let currentTeam = -1;
    	let guess = "";
    	let message = "";
    	let bankMoney = 0;
    	let teamMoney = [0, 0];
    	let strikes = [];

    	function displayMessage(text, seconds) {
    		if (messageTimeout) {
    			clearTimeout(messageTimeout);
    		}

    		messageTimeout = null;
    		$$invalidate(10, message = text);
    		$$invalidate(4, showMessage = true);

    		if (seconds <= 0) {
    			return;
    		}

    		messageTimeout = setTimeout(
    			() => {
    				$$invalidate(10, message = "");
    				$$invalidate(4, showMessage = false);
    			},
    			seconds * 1000
    		);
    	}

    	function setAnswerVisibility(show) {
    		let answers = qas[qaIndex].answers.map(answer => {
    			answer.show = show;
    			return answer;
    		});

    		$$invalidate(0, qas[qaIndex].answers = answers, qas);
    	}

    	function allShown() {
    		let shown = 0;
    		let answers = qas[qaIndex].answers;
    		let length = answers.length;

    		for (let i = 0; i < length; ++i) {
    			let answer = answers[i];

    			if (answer.show) {
    				shown += 1;
    			}
    		}

    		return shown === length;
    	}

    	function startGame() {
    		faceOff = true;
    		$$invalidate(5, start = true);
    		displayMessage("Face off! First team to call out their answer goes first.", 4);
    	}

    	function handleGuess(e) {
    		setAnimation(false);
    		guess = e.detail;
    		$$invalidate(6, showPass = false);
    		let match = false;
    		let money = 0;
    		let answers = qas[qaIndex].answers;
    		let length = answers.length;

    		for (let i = 0; i < length; ++i) {
    			let answer = answers[i];
    			match = FunctionLib.leveinsteinerDistance(answer.text.toLowerCase(), guess.toLowerCase()) <= 1;

    			if (match) {
    				if (answer.show) {
    					break;
    				}

    				money = answer.money;
    				answer.show = true;
    				break;
    			}
    		}

    		$$invalidate(0, qas[qaIndex].answers = answers, qas);

    		if (match) {
    			playSound("ding", 0.1);
    		} else {
    			playSound("buzzer", 0.02);
    		}

    		if (allShown()) {
    			$$invalidate(12, teamMoney[currentTeam] += bankMoney + money, teamMoney);
    			$$invalidate(11, bankMoney = 0);
    			$$invalidate(8, next = true);
    			setAnimation(true);
    			playSound("cheer", 0.1);
    			displayMessage("Team " + teamNames[currentTeam] + " wins the round!", 3);
    			return;
    		}

    		if (faceOff) {
    			if (!match) {
    				$$invalidate(7, teamDisable = [false, false]);
    				$$invalidate(7, teamDisable[e.teamNumber] = true, teamDisable);
    			} else {
    				currentTeam = e.teamNumber;

    				if (e.teamNumber == 1) {
    					$$invalidate(7, teamDisable[0] = true, teamDisable);
    				} else {
    					$$invalidate(7, teamDisable[1] = true, teamDisable);
    				}

    				displayMessage("Team " + teamNames[currentTeam] + " wins the face off! Wanna pass?", 6);
    				faceOff = false;
    				$$invalidate(11, bankMoney = money);
    				$$invalidate(6, showPass = true);
    			}
    		} else if (steal) {
    			if (!match) {
    				currentTeam += 1;

    				if (currentTeam > 1) {
    					currentTeam = 0;
    				}

    				$$invalidate(12, teamMoney[currentTeam] += bankMoney, teamMoney);
    			} else {
    				$$invalidate(12, teamMoney[currentTeam] += bankMoney + money, teamMoney);
    			}

    			$$invalidate(11, bankMoney = 0);
    			setAnswerVisibility(true);
    			setAnimation(true);
    			playSound("cheer", 0.1);
    			displayMessage("Team " + teamNames[currentTeam] + " wins the round!", 4);
    			$$invalidate(8, next = true);
    		} else {
    			if (!match) {
    				$$invalidate(13, strikes += ["☒"]);
    				displayMessage("Strike!", 1);

    				if (strikes.length >= 3) {
    					$$invalidate(7, teamDisable = [false, false]);
    					$$invalidate(7, teamDisable[e.teamNumber] = true, teamDisable);
    					steal = true;
    					currentTeam = e.teamNumber + 1;

    					if (currentTeam > 1) {
    						currentTeam = 0;
    					}

    					displayMessage("Team " + teamNames[currentTeam] + " can steal!", 5);
    				}
    			} else {
    				$$invalidate(11, bankMoney += money);
    			}
    		}
    	}

    	function pass() {
    		if (currentTeam < 0) {
    			$$invalidate(6, showPass = false);
    			return;
    		}

    		$$invalidate(7, teamDisable[currentTeam] = true, teamDisable);
    		currentTeam += 1;

    		if (currentTeam > 1) {
    			currentTeam = 0;
    		}

    		$$invalidate(7, teamDisable[currentTeam] = false, teamDisable);
    		$$invalidate(6, showPass = false);
    		displayMessage(`Team ${teamNames[currentTeam]} now has the board.`, 4);
    	}

    	function nextRound(e) {
    		if (qaIndex + 1 >= qas.length) {
    			$$invalidate(9, end = true);
    			let winningTeam = teamMoney[0] > teamMoney[1] ? 0 : 1;
    			setAnimation(true);
    			playSound("cheer", 0.1);
    			displayMessage("Team " + teamNames[winningTeam] + " wins the game!", 6);
    		} else {
    			setAnswerVisibility(false);
    			$$invalidate(2, qaIndex += 1);
    			setAnimation(false);
    			displayMessage("Face off!", 3);
    		}

    		$$invalidate(8, next = false);
    		faceOff = true;
    		steal = false;
    		$$invalidate(6, showPass = false);
    		$$invalidate(7, teamDisable = [false, false]);
    		currentTeam = -1;
    		guess = "";
    		$$invalidate(11, bankMoney = 0);
    		$$invalidate(13, strikes = []);
    	}

    	function restart(e) {
    		setAnswerVisibility(false);
    		$$invalidate(2, qaIndex = 0);
    		$$invalidate(5, start = false);
    		faceOff = false;
    		$$invalidate(7, teamDisable = [false, false]);
    		steal = false;
    		$$invalidate(6, showPass = false);
    		$$invalidate(8, next = false);
    		$$invalidate(9, end = false);
    		teamsetup = false;
    		currentTeam = -1;
    		guess = "";
    		$$invalidate(11, bankMoney = 0);
    		$$invalidate(12, teamMoney = [0, 0]);
    		$$invalidate(13, strikes = []);
    		playSound("theme", 0.1);
    	}

    	playSound("theme", 0.1);
    	const writable_props = ["qas", "teamNames", "props"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("App", $$slots, []);

    	function function_1_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(3, FunctionLib = $$value);
    		});
    	}

    	const click_handler = () => $$invalidate(4, showMessage = false);

    	const guess_handler = e => {
    		e.teamNumber = 0;
    		handleGuess(e);
    	};

    	const guess_handler_1 = e => {
    		e.teamNumber = 1;
    		handleGuess(e);
    	};

    	$$self.$set = $$props => {
    		if ("qas" in $$props) $$invalidate(0, qas = $$props.qas);
    		if ("teamNames" in $$props) $$invalidate(1, teamNames = $$props.teamNames);
    		if ("props" in $$props) $$invalidate(19, props = $$props.props);
    	};

    	$$self.$capture_state = () => ({
    		Board,
    		Guess,
    		Function,
    		qas,
    		teamNames,
    		onMount,
    		props,
    		qaIndex,
    		FunctionLib,
    		showMessage,
    		start,
    		faceOff,
    		showPass,
    		teamDisable,
    		steal,
    		next,
    		end,
    		messageTimeout,
    		currentTeam,
    		guess,
    		message,
    		bankMoney,
    		teamMoney,
    		strikes,
    		playSound,
    		setAnimation,
    		displayMessage,
    		setAnswerVisibility,
    		allShown,
    		startGame,
    		handleGuess,
    		pass,
    		nextRound,
    		restart
    	});

    	$$self.$inject_state = $$props => {
    		if ("qas" in $$props) $$invalidate(0, qas = $$props.qas);
    		if ("teamNames" in $$props) $$invalidate(1, teamNames = $$props.teamNames);
    		if ("props" in $$props) $$invalidate(19, props = $$props.props);
    		if ("qaIndex" in $$props) $$invalidate(2, qaIndex = $$props.qaIndex);
    		if ("FunctionLib" in $$props) $$invalidate(3, FunctionLib = $$props.FunctionLib);
    		if ("showMessage" in $$props) $$invalidate(4, showMessage = $$props.showMessage);
    		if ("start" in $$props) $$invalidate(5, start = $$props.start);
    		if ("faceOff" in $$props) faceOff = $$props.faceOff;
    		if ("showPass" in $$props) $$invalidate(6, showPass = $$props.showPass);
    		if ("teamDisable" in $$props) $$invalidate(7, teamDisable = $$props.teamDisable);
    		if ("steal" in $$props) steal = $$props.steal;
    		if ("next" in $$props) $$invalidate(8, next = $$props.next);
    		if ("end" in $$props) $$invalidate(9, end = $$props.end);
    		if ("messageTimeout" in $$props) messageTimeout = $$props.messageTimeout;
    		if ("currentTeam" in $$props) currentTeam = $$props.currentTeam;
    		if ("guess" in $$props) guess = $$props.guess;
    		if ("message" in $$props) $$invalidate(10, message = $$props.message);
    		if ("bankMoney" in $$props) $$invalidate(11, bankMoney = $$props.bankMoney);
    		if ("teamMoney" in $$props) $$invalidate(12, teamMoney = $$props.teamMoney);
    		if ("strikes" in $$props) $$invalidate(13, strikes = $$props.strikes);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		qas,
    		teamNames,
    		qaIndex,
    		FunctionLib,
    		showMessage,
    		start,
    		showPass,
    		teamDisable,
    		next,
    		end,
    		message,
    		bankMoney,
    		teamMoney,
    		strikes,
    		startGame,
    		handleGuess,
    		pass,
    		nextRound,
    		restart,
    		props,
    		faceOff,
    		steal,
    		messageTimeout,
    		currentTeam,
    		guess,
    		displayMessage,
    		setAnswerVisibility,
    		allShown,
    		function_1_binding,
    		click_handler,
    		guess_handler,
    		guess_handler_1
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, { qas: 0, teamNames: 1, props: 19 }, [-1, -1]);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$7.name
    		});
    	}

    	get qas() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set qas(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get teamNames() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set teamNames(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get props() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set props(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /*
      (C) 2020 David Lettier
      lettier.com
    */

    const app = new App({
      target: document.body,
      props: {
        teamNames: ["Spark Team", "Neputune Team"],
        qas: [
          {
            question: "Which programing language is dead?",
            answers: [
              {
                text: "Neptune",
                money: 1000
              },
              {
                text: "Perl",
                money: 17
              },
              {
                text: "PHP",
                money: 11
              },
              {
                text: "Haskell",
                money: 6
              },
              {
                text: "Lisp",
                money: 4
              },
              {
                text: "Ruby",
                money: 3
              },
            ]
          },
          {
            question: "What is the most hated thing about programming?",
            answers: [
              {
                text: "Whiteboarding",
                money: 17
              },
              {
                text: "Naming Things",
                money: 11
              },
              {
                text: "Stand-ups",
                money: 6
              },
              {
                text: "OBOE",
                money: 4
              },
              {
                text: "Cache Invalidation",
                money: 3
              },
              {
                text: "Jira",
                money: 1
              }
            ]
          },
          {
            question: "Name a flame war you've been in.",
            answers: [
              {
                text: "Tabs vs Spaces",
                money: 17
              },
              {
                text: "OOP vs Functional",
                money: 11
              },
              {
                text: "GNOME vs KDE",
                money: 6
              },
              {
                text: "Vim vs Emacs",
                money: 4
              },
              {
                text: "Chrome vs Firefox",
                money: 3
              },
              {
                text: "NoSQL vs RDMS",
                money: 1
              }
            ]
          },
          {
            question: "Which language should you rewrite something in?",
            answers: [
              {
                  text: "Rust",
                money: 17
              },
              {
                text: "Go",
                money: 11
              },
              {
                text: "JavaScript",
                money: 6
              },
              {
                text: "Elm",
                money: 4
              },
              {
                text: "Kotlin",
                money: 3
              },
              {
                text: "Elixir",
                money: 1
              }
            ]
          }
        ]
      }
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
