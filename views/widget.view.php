<?php declare(strict_types = 0);

/**
 * Items Health widget view.
 *
 * @var CView  $this
 * @var array  $data
 */

$view = new CWidgetView($data);

foreach ($data['vars'] as $name => $value) {
	$view->setVar($name, $value);
}

$view->show();
