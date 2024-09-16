import React from 'react';
import ReactTooltip from 'react-tooltip'

import {SourceItem} from '../Item/Item'
import {allowed_zone, get_limits} from '../../util'

import './ItemTable.css';

function compare_factory(key) {
    return function (prop) {
        return function (a, b) {
            a = prop[a];
            b = prop[b];
            if (a === undefined || a[key] === undefined || b === undefined || b[key] === undefined) {
                return true;
            }
            let result;
            if (a[key][1] !== b[key][1]) {
                // HACK: place items from different titan versions in same bucket
                if (a[key][0].substring(0, a[key][0].length - 2) === b[key][0].substring(0, b[key][0].length - 2)) {
                    result = a.slot[1] - b.slot[1];
                } else if (a[key][1] * b[key][1] < 0) {
                    result = a[key][1] - b[key][1];
                } else {
                    result = b[key][1] - a[key][1];
                }
            } else {
                result = a.slot[1] - b.slot[1]
            }
            return result;
        }
    }
}

function group(a, b, g) {
    if (a === undefined || b === undefined) {
        return false;
    }
    // HACK: place items from different titan versions in same bucket
    return a[g][0].substring(0, a[g][0].length - 2) !== b[g][0].substring(0, b[g][0].length - 2);
}

export default class ItemTable extends React.Component {
    constructor(props) {
        super(props);
        this.localbuffer = [];
    }

    componentDidUpdate() {
        ReactTooltip.rebuild();
    }

    handleZoneClick(e, zoneId) {
        if (e.ctrlKey || e.altKey) {
            this.props.handleDisableZone(zoneId);
        } else if (e.shiftKey) {
            this.props.handleSettings('compactitemlist', !this.props.compactitemlist);
        } else {
            this.props.handleHideZone(zoneId);
        }
    }

    create_section(buffer, last, class_idx, groupName = '') {
        if (groupName.length === 0) {
            groupName = last[this.props.group][0];
        }
        if (this.localbuffer.length > 0) {
            buffer.push(<div className='item-section' key={class_idx++}>
                <span onClick={(e) => this.handleZoneClick(e, last.zone[1])}>{groupName}<br/></span>
                {
                    this.props.hidden[last.zone[1]]
                        ? undefined
                        : this.localbuffer
                }
            </div>);
            this.localbuffer = [];
        }
        return class_idx;
    }

    render() {
        //TODO: sorting on every change is very inefficient
        let buffer = [];
        let class_idx = 0;
        const limits = get_limits(this.props);
        {
            const compare = compare_factory(this.props.group)(this.props.itemdata);
            const sorted = this.props.items.sort(compare);
            let last = undefined;
            for (let idx = 0; idx < sorted.length; idx++) {
                const id = sorted[idx];
                const item = this.props.itemdata[id];
                if (item.empty) {
                    continue;
                }
                let next = group(last, item, this.props.group);
                if (next && (!this.props.compactitemlist || last.zone[1] < 0)) {
                    class_idx = this.create_section(buffer, last, class_idx)
                }
                let className = '';
                if (!item.disable && this.props.showunused) {
                    className = ' unused-item';
                    this.props.savedequip.forEach(save => {
                        if (className === '') {
                            return;
                        }
                        if (save.ignore) {
                            return;
                        }
                        if (save[item.slot[0]] === undefined) {
                            return;
                        }
                        save[item.slot[0]].forEach(i => {
                            if (i === id) {
                                className = '';
                            }
                        });
                    });
                }
                if (allowed_zone(this.props.itemdata, limits, id) && !(this.props.compactitemlist && item.disable)) {
                    this.localbuffer.push(<SourceItem className={className} item={item}
                                                      handleClickItem={this.props.handleClickItem}
                                                      handleCtrlClickItem={this.props.handleCtrlClickItem}
                                                      handleShiftClickItem={(itemId) => this.props.handleEditItem(itemId, -1)}
                                                      handleRightClickItem={this.props.handleRightClickItem}
                                                      key={id}/>);
                }
                last = item;
            }
            class_idx = this.create_section(buffer, this.props.compactitemlist ? {zone: Infinity} : last, class_idx, this.props.compactitemlist ? 'Items' : '');
        }
        return (<div className='item-table'>
            {buffer}
        </div>);
    }
}
