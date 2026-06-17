/*
** Host Items State Widget for Zabbix 7.0
** Displays count by state (Normal / Not supported / Disabled) for Items, Triggers or Discovery rules.
*/

class CWidgetHostItemsState extends CWidget {

	static GRAPH_TYPE_PIE = 1;
	static GRAPH_TYPE_HORIZONTAL_BAR = 2;
	static GRAPH_TYPE_VERTICAL_BAR = 3;

	static SOURCE_ITEMS     = 1;
	static SOURCE_TRIGGERS  = 2;
	static SOURCE_DISCOVERY = 3;

	static ANIM_DURATION = 550;

	#chart_data = null;
	#tooltip    = null;
	#anim_id    = null;
	#do_animate = true;

	// ---------------------------------------------------------------------------
	// CWidget lifecycle
	// ---------------------------------------------------------------------------

	setContents(response) {
		this.#cancelAnimation();
		this._body.innerHTML = '';
		this.#hideTooltip();
		this.#do_animate = true;

		if (!response.counts) {
			this._body.appendChild(this.#makeNoData());
			this.#chart_data = null;
			return;
		}

		this.#chart_data = {
			source:      response.source,
			counts:      response.counts,
			hostid:      response.hostid,
			graph_type:  response.graph_type,
			show_legend: response.show_legend,
			show_links:  response.show_links
		};

		this.#render();
	}

	onResize() {
		if (this.getState() === WIDGET_STATE_ACTIVE && this.#chart_data !== null) {
			this.#cancelAnimation();
			this.#do_animate = false;
			this.#render();
		}
	}

	onClearContents() {
		this.#cancelAnimation();
		this.#destroyTooltip();
		this.#chart_data = null;
	}

	hasPadding() {
		return this.getViewMode() === ZBX_WIDGET_VIEW_MODE_NORMAL;
	}

	// ---------------------------------------------------------------------------
	// State definitions per source
	// ---------------------------------------------------------------------------

	#getStates() {
		switch (this.#chart_data.source) {
			case CWidgetHostItemsState.SOURCE_TRIGGERS:
				return [
					{ key: 'enabled',  color: '#4CAF50' },
					{ key: 'unknown',  color: '#FF9800' },
					{ key: 'disabled', color: '#9E9E9E' }
				];
			case CWidgetHostItemsState.SOURCE_DISCOVERY:
				return [
					{ key: 'enabled',      color: '#4CAF50' },
					{ key: 'notsupported', color: '#E53935' },
					{ key: 'disabled',     color: '#9E9E9E' }
				];
			default: // SOURCE_ITEMS
				return [
					{ key: 'normal',       color: '#4CAF50' },
					{ key: 'notsupported', color: '#E53935' },
					{ key: 'disabled',     color: '#9E9E9E' }
				];
		}
	}

	// ---------------------------------------------------------------------------
	// Labels
	// ---------------------------------------------------------------------------

	#stateLabel(key) {
		switch (key) {
			case 'normal':       return t('Normal');
			case 'notsupported': return t('Not supported');
			case 'enabled':      return t('Enabled');
			case 'unknown':      return t('Unknown');
			case 'disabled':     return t('Disabled');
		}
		return key;
	}

	// ---------------------------------------------------------------------------
	// Navigation
	// ---------------------------------------------------------------------------

	#listUrl(state_key) {
		const { hostid, show_links, source } = this.#chart_data;
		if (!show_links || !hostid) return null;

		// filter_hostids[0]=<id>  (URL-encoded brackets)
		const host_filter = '&filter_hostids%5B0%5D=' + encodeURIComponent(hostid);

		switch (source) {
			case CWidgetHostItemsState.SOURCE_TRIGGERS: {
				const base = 'zabbix.php?action=trigger.list&context=host&filter_set=1' + host_filter;
				switch (state_key) {
					case 'enabled':  return base + '&filter_status=0&filter_state=0';
					case 'unknown':  return base + '&filter_status=0&filter_state=1';
					case 'disabled': return base + '&filter_status=1';
				}
				break;
			}
			case CWidgetHostItemsState.SOURCE_DISCOVERY: {
				const base = 'zabbix.php?action=disc.rule.list&context=host&filter_set=1' + host_filter;
				switch (state_key) {
					case 'enabled':      return base + '&filter_state=0';
					case 'notsupported': return base + '&filter_state=1';
					case 'disabled':     return base + '&filter_status=1';
				}
				break;
			}
			default: { // SOURCE_ITEMS
				const base = 'zabbix.php?action=item.list&context=host&filter_set=1' + host_filter;
				switch (state_key) {
					case 'normal':       return base + '&filter_state=0';
					case 'notsupported': return base + '&filter_state=1';
					case 'disabled':     return base + '&filter_status=1';
				}
			}
		}
		return null;
	}

	#navigate(state_key) {
		const url = this.#listUrl(state_key);
		if (url) window.location.href = url;
	}

	// ---------------------------------------------------------------------------
	// Root render
	// ---------------------------------------------------------------------------

	#render() {
		this._body.innerHTML = '';
		this.#hideTooltip();

		const { counts, graph_type, show_legend } = this.#chart_data;
		const states = this.#getStates();
		const total  = states.reduce((s, st) => s + (counts[st.key] || 0), 0);

		if (total === 0) {
			this._body.appendChild(this.#makeNoData());
			return;
		}

		// Vertical bar uses side-by-side layout (bar left, legend right).
		const side_legend = (graph_type === CWidgetHostItemsState.GRAPH_TYPE_VERTICAL_BAR && show_legend);

		const wrapper = document.createElement('div');
		wrapper.style.cssText = 'width:100%;height:100%;display:flex;'
			+ `flex-direction:${side_legend ? 'row' : 'column'};box-sizing:border-box;`;

		const chart_area = document.createElement('div');
		chart_area.style.cssText = side_legend
			? 'flex:0 0 40%;min-width:48px;position:relative;'
			: 'flex:1;min-height:0;position:relative;';

		wrapper.appendChild(chart_area);

		if (show_legend) {
			wrapper.appendChild(this.#renderLegend(counts, states, side_legend));
		}

		this._body.appendChild(wrapper);

		requestAnimationFrame(() => {
			const w = chart_area.offsetWidth;
			const h = chart_area.offsetHeight;
			if (w <= 0 || h <= 0) return;

			switch (graph_type) {
				case CWidgetHostItemsState.GRAPH_TYPE_PIE:
					this.#renderPie(chart_area, w, h, counts, total, states);
					break;
				case CWidgetHostItemsState.GRAPH_TYPE_HORIZONTAL_BAR:
					this.#renderHorizontalBar(chart_area, w, h, counts, total, states);
					break;
				case CWidgetHostItemsState.GRAPH_TYPE_VERTICAL_BAR:
					this.#renderVerticalBar(chart_area, w, h, counts, total, states);
					break;
			}
		});
	}

	// ---------------------------------------------------------------------------
	// Pie / donut  — clockwise unroll animation
	// ---------------------------------------------------------------------------

	#renderPie(container, width, height, counts, total, states) {
		const svg   = this.#makeSvg(width, height);
		const cx    = width / 2;
		const cy    = height / 2;
		const r_out = Math.min(cx, cy) * 0.88;
		const r_in  = r_out * 0.58;
		const GAP   = total > 1 ? 1.5 : 0;

		// Pre-calculate segments.
		const segs = [];
		let angle = 0;
		for (const state of states) {
			const count = counts[state.key] || 0;
			if (count === 0) continue;
			const sweep = (count / total) * 360;
			segs.push({ start: angle, sweep, color: state.color, key: state.key, count });
			angle += sweep;
		}

		const paths_g = this.#svgEl('g');
		svg.appendChild(paths_g);

		// Centre label — fades in at end of animation.
		const ctr_g = this.#svgEl('g');
		ctr_g.setAttribute('pointer-events', 'none');
		ctr_g.style.opacity = '0';
		svg.appendChild(ctr_g);

		const fs_big = Math.max(13, Math.round(r_in * 0.42));
		const fs_sm  = Math.max(10, Math.round(r_in * 0.22));

		const mk_txt = (x, y, fs, bold, fill, content) => {
			const el = this.#svgEl('text');
			el.setAttribute('x', x);
			el.setAttribute('y', y);
			el.setAttribute('text-anchor', 'middle');
			el.setAttribute('dominant-baseline', 'middle');
			el.setAttribute('font-size', fs);
			if (bold) el.setAttribute('font-weight', 'bold');
			el.setAttribute('fill', fill);
			el.textContent = content;
			return el;
		};

		ctr_g.appendChild(mk_txt(cx, cy - fs_sm * 0.7, fs_big, true,
			'var(--color-text-primary,#eee)', total));
		ctr_g.appendChild(mk_txt(cx, cy + fs_big * 0.6, fs_sm, false,
			'var(--color-text-secondary,#aaa)', t('total')));

		container.appendChild(svg);

		const draw = (progress) => {
			paths_g.innerHTML = '';
			let drawn = 0;
			const stop = 360 * progress;

			for (const seg of segs) {
				if (drawn >= stop) break;
				const sweep = Math.min(seg.sweep, stop - drawn);
				if (sweep <= GAP) continue;

				const path = this.#svgEl('path');
				path.setAttribute('d', this.#arcPath(
					cx, cy, r_out, r_in,
					seg.start + GAP / 2,
					seg.start + sweep - GAP / 2
				));
				path.setAttribute('fill', seg.color);

				if (progress >= 1) {
					this.#attachInteraction(path, seg.key, seg.count);
				}

				paths_g.appendChild(path);
				drawn += seg.sweep;
			}

			ctr_g.style.opacity = progress > 0.7
				? Math.min(1, (progress - 0.7) / 0.3).toFixed(3)
				: '0';
		};

		this.#do_animate
			? this.#runAnimation(CWidgetHostItemsState.ANIM_DURATION, draw)
			: draw(1);
	}

	// ---------------------------------------------------------------------------
	// Horizontal stacked bar  — left-to-right reveal
	// ---------------------------------------------------------------------------

	#renderHorizontalBar(container, width, height, counts, total, states) {
		const svg   = this.#makeSvg(width, height);
		const PAD_H = 16;
		const bar_h = Math.min(44, Math.round(height * 0.35));
		const bar_y = Math.round((height - bar_h) / 2);
		const bar_w = width - PAD_H * 2;

		const { clip_rect } = this.#makeClipRect(svg, PAD_H, bar_y, 0, bar_h);
		const g = this.#svgEl('g');
		g.setAttribute('clip-path', `url(#${clip_rect._clip_id})`);

		const texts = [];
		let x = PAD_H;

		for (const state of states) {
			const count = counts[state.key] || 0;
			if (count === 0) continue;

			const seg_w = Math.round((count / total) * bar_w);

			const rect = this.#svgEl('rect');
			rect.setAttribute('x', x);
			rect.setAttribute('y', bar_y);
			rect.setAttribute('width', seg_w);
			rect.setAttribute('height', bar_h);
			rect.setAttribute('fill', state.color);
			this.#attachInteraction(rect, state.key, count);
			g.appendChild(rect);

			if (seg_w >= 28) {
				const txt = this.#svgEl('text');
				txt.setAttribute('x', x + seg_w / 2);
				txt.setAttribute('y', bar_y + bar_h / 2);
				txt.setAttribute('text-anchor', 'middle');
				txt.setAttribute('dominant-baseline', 'middle');
				txt.setAttribute('font-size', Math.min(13, bar_h * 0.38));
				txt.setAttribute('fill', '#fff');
				txt.setAttribute('pointer-events', 'none');
				txt.style.opacity = '0';
				g.appendChild(txt);
				texts.push(txt);
			}

			x += seg_w;
		}

		svg.appendChild(g);
		container.appendChild(svg);

		const draw = (p) => {
			clip_rect.setAttribute('width', Math.round(bar_w * p));
			texts.forEach(el => {
				el.style.opacity = Math.max(0, (p - 0.6) / 0.4).toFixed(3);
			});
		};

		this.#do_animate
			? this.#runAnimation(CWidgetHostItemsState.ANIM_DURATION, draw)
			: draw(1);
	}

	// ---------------------------------------------------------------------------
	// Vertical stacked bar (single bar)  — bottom-to-top reveal
	// ---------------------------------------------------------------------------

	#renderVerticalBar(container, width, height, counts, total, states) {
		const svg     = this.#makeSvg(width, height);
		const PAD_V   = 8;
		const bar_w   = Math.min(80, Math.round((width - 16) * 0.72));
		const bar_x   = Math.round((width - bar_w) / 2);
		const chart_h = height - PAD_V * 2;

		const { clip_rect } = this.#makeClipRect(svg, bar_x, PAD_V + chart_h, bar_w, 0);
		const g = this.#svgEl('g');
		g.setAttribute('clip-path', `url(#${clip_rect._clip_id})`);

		let y = PAD_V;
		for (const state of states) {
			const count = counts[state.key] || 0;
			if (count === 0) continue;

			const seg_h = Math.round((count / total) * chart_h);

			const rect = this.#svgEl('rect');
			rect.setAttribute('x', bar_x);
			rect.setAttribute('y', y);
			rect.setAttribute('width', bar_w);
			rect.setAttribute('height', seg_h);
			rect.setAttribute('fill', state.color);
			this.#attachInteraction(rect, state.key, count);
			g.appendChild(rect);

			y += seg_h;
		}

		svg.appendChild(g);
		container.appendChild(svg);

		const draw = (p) => {
			const h = Math.round(chart_h * p);
			clip_rect.setAttribute('y', PAD_V + chart_h - h);
			clip_rect.setAttribute('height', h);
		};

		this.#do_animate
			? this.#runAnimation(CWidgetHostItemsState.ANIM_DURATION, draw)
			: draw(1);
	}

	// ---------------------------------------------------------------------------
	// Legend
	// ---------------------------------------------------------------------------

	#renderLegend(counts, states, side = false) {
		const legend = document.createElement('div');
		if (side) {
			// Vertical bar: legend fills the right column, items centered vertically.
			legend.style.cssText = 'flex:1;display:flex;flex-direction:column;justify-content:center;'
				+ 'padding:8px 14px;gap:6px;min-width:0;';
		} else {
			// Pie / horizontal bar: legend is a footer strip below the chart.
			legend.style.cssText = 'padding:6px 14px 4px;display:flex;flex-direction:column;gap:3px;';
		}

		for (const state of states) {
			const count = counts[state.key] || 0;
			const url   = this.#listUrl(state.key);

			const inner = url ? document.createElement('a') : document.createElement('div');
			if (url) {
				inner.href = url;
				inner.style.cssText = 'display:flex;align-items:center;gap:8px;'
					+ 'text-decoration:none;color:inherit;cursor:pointer;';
			} else {
				inner.style.cssText = 'display:flex;align-items:center;gap:8px;';
			}

			const swatch = document.createElement('span');
			swatch.style.cssText = `width:10px;height:10px;border-radius:2px;`
				+ `background:${state.color};flex-shrink:0;`;

			const label_el = document.createElement('span');
			label_el.style.cssText = 'font-size:13px;flex:1;overflow:hidden;'
				+ 'text-overflow:ellipsis;white-space:nowrap;';
			label_el.textContent = this.#stateLabel(state.key);

			const count_el = document.createElement('span');
			count_el.style.cssText = 'font-size:13px;font-weight:600;'
				+ 'margin-left:auto;padding-left:12px;flex-shrink:0;';
			count_el.textContent = count;

			inner.appendChild(swatch);
			inner.appendChild(label_el);
			inner.appendChild(count_el);
			legend.appendChild(inner);
		}

		return legend;
	}

	// ---------------------------------------------------------------------------
	// Interaction (hover tooltip + optional click navigation)
	// ---------------------------------------------------------------------------

	#attachInteraction(el, state_key, count) {
		const label     = this.#stateLabel(state_key);
		const clickable = this.#chart_data.show_links;

		el.style.cursor = clickable ? 'pointer' : 'default';

		el.addEventListener('mouseenter', (e) => {
			el.style.opacity = '0.78';
			this.#showTooltip(e, label, count);
		});
		el.addEventListener('mousemove', (e) => this.#positionTooltip(e));
		el.addEventListener('mouseleave', () => {
			el.style.opacity = '1';
			this.#hideTooltip();
		});

		if (clickable) {
			el.addEventListener('click', () => this.#navigate(state_key));
		}
	}

	// ---------------------------------------------------------------------------
	// Tooltip
	// ---------------------------------------------------------------------------

	#ensureTooltip() {
		if (!this.#tooltip) {
			const tt = document.createElement('div');
			tt.style.cssText = [
				'position:fixed',
				'padding:5px 10px',
				'border-radius:4px',
				'background:rgba(18,18,18,0.90)',
				'color:#fff',
				'font-size:12px',
				'line-height:1.5',
				'pointer-events:none',
				'display:none',
				'z-index:99999',
				'white-space:nowrap',
				'box-shadow:0 2px 8px rgba(0,0,0,0.35)'
			].join(';');
			document.body.appendChild(tt);
			this.#tooltip = tt;
		}
		return this.#tooltip;
	}

	#showTooltip(e, label, count) {
		const tt = this.#ensureTooltip();
		tt.innerHTML = `<strong>${label}</strong>: ${count}`;
		tt.style.display = 'block';
		this.#positionTooltip(e);
	}

	#positionTooltip(e) {
		const tt = this.#tooltip;
		if (!tt || tt.style.display === 'none') return;
		const x  = e.clientX + 14;
		const y  = e.clientY - 36;
		const tw = tt.offsetWidth;
		const th = tt.offsetHeight;
		tt.style.left = Math.min(x, window.innerWidth  - tw - 8) + 'px';
		tt.style.top  = Math.max(8, Math.min(y, window.innerHeight - th - 8)) + 'px';
	}

	#hideTooltip() {
		if (this.#tooltip) this.#tooltip.style.display = 'none';
	}

	#destroyTooltip() {
		if (this.#tooltip) {
			this.#tooltip.remove();
			this.#tooltip = null;
		}
	}

	// ---------------------------------------------------------------------------
	// Animation
	// ---------------------------------------------------------------------------

	#runAnimation(duration, callback) {
		const start = performance.now();

		const tick = (now) => {
			const t     = Math.min((now - start) / duration, 1);
			const eased = 1 - Math.pow(1 - t, 3); // cubic ease-out
			callback(eased);
			this.#anim_id = t < 1 ? requestAnimationFrame(tick) : null;
		};

		this.#anim_id = requestAnimationFrame(tick);
	}

	#cancelAnimation() {
		if (this.#anim_id !== null) {
			cancelAnimationFrame(this.#anim_id);
			this.#anim_id = null;
		}
	}

	// ---------------------------------------------------------------------------
	// SVG helpers
	// ---------------------------------------------------------------------------

	#makeSvg(w, h) {
		const svg = this.#svgEl('svg');
		svg.setAttribute('width', w);
		svg.setAttribute('height', h);
		svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
		svg.style.display = 'block';
		return svg;
	}

	/**
	 * Creates <defs><clipPath><rect/></clipPath></defs> in svg.
	 * The returned rect carries ._clip_id for url() reference.
	 */
	#makeClipRect(svg, x, y, w, h) {
		const clip_id   = 'his-clip-' + Math.random().toString(36).slice(2);
		const defs      = this.#svgEl('defs');
		const clip      = this.#svgEl('clipPath');
		const clip_rect = this.#svgEl('rect');
		clip.id = clip_id;
		clip_rect._clip_id = clip_id;
		clip_rect.setAttribute('x', x);
		clip_rect.setAttribute('y', y);
		clip_rect.setAttribute('width', w);
		clip_rect.setAttribute('height', h);
		clip.appendChild(clip_rect);
		defs.appendChild(clip);
		svg.appendChild(defs);
		return { clip_rect };
	}

	#svgEl(tag) {
		return document.createElementNS('http://www.w3.org/2000/svg', tag);
	}

	#polar(cx, cy, r, deg) {
		const rad = (deg - 90) * Math.PI / 180;
		return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
	}

	#arcPath(cx, cy, r_out, r_in, a_start, a_end) {
		if (a_end - a_start >= 360) a_end = a_start + 359.99;
		const large = (a_end - a_start) > 180 ? 1 : 0;
		const p1 = this.#polar(cx, cy, r_out, a_start);
		const p2 = this.#polar(cx, cy, r_out, a_end);
		const p3 = this.#polar(cx, cy, r_in,  a_end);
		const p4 = this.#polar(cx, cy, r_in,  a_start);
		return [
			`M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`,
			`A ${r_out} ${r_out} 0 ${large} 1 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`,
			`L ${p3.x.toFixed(2)} ${p3.y.toFixed(2)}`,
			`A ${r_in}  ${r_in}  0 ${large} 0 ${p4.x.toFixed(2)} ${p4.y.toFixed(2)}`,
			'Z'
		].join(' ');
	}

	// ---------------------------------------------------------------------------
	// Misc
	// ---------------------------------------------------------------------------

	#makeNoData() {
		const el = document.createElement('div');
		el.style.cssText = 'display:flex;align-items:center;justify-content:center;'
			+ 'height:100%;color:var(--color-text-secondary,#aaa);font-size:14px;';
		el.textContent = t('No data.');
		return el;
	}
}
