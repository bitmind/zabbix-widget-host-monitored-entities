<?php declare(strict_types = 0);

namespace Modules\HostItemsState;

use Zabbix\Core\CWidget;

class Widget extends CWidget {

	public const GRAPH_TYPE_PIE = 1;
	public const GRAPH_TYPE_HORIZONTAL_BAR = 2;
	public const GRAPH_TYPE_VERTICAL_BAR = 3;

	public const SOURCE_ITEMS     = 1;
	public const SOURCE_TRIGGERS  = 2;
	public const SOURCE_DISCOVERY = 3;

	public const LEGEND_NONE   = 0;
	public const LEGEND_TOP    = 1;
	public const LEGEND_BOTTOM = 2;
	public const LEGEND_LEFT   = 3;
	public const LEGEND_RIGHT  = 4;

	public function getDefaultName(): string {
		return _('Host monitoring entities');
	}

	public function getTranslationStrings(): array {
		return [
			'class.widget.js' => []
		];
	}
}
