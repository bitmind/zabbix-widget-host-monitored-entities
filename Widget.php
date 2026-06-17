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

	public function getDefaultName(): string {
		return _('Host items state');
	}

	public function getTranslationStrings(): array {
		return [
			'class.widget.js' => []
		];
	}
}
