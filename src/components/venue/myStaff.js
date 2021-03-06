import React, { Component } from "react"
import NavBar from "./../layouts/NavBar"
import { bindActionCreators } from "redux"
import { connect } from "react-redux"
import API from "./../../services/api"
import "./myStaff.css"
import NewTaskField from "./NewTaskField"
import NewSuggestionField from "./NewSuggestionField"
import PropTypes from "prop-types"
import moment from "moment"
import { Button } from "react-bootstrap"
import _ from "lodash/core"
import { Link } from "react-router-dom"

import StaffTimePicker from "./staffTimePicker"

import SchedulePopOver from "./SchedulePopOver"
// import PaymentModal from "./PaymentModal"

class MyStaff extends Component {
  constructor(props) {
    super(props)
    this.state = {
      isLoading: false,
      suggestions: [],
      myStaffs: [],
      currentTab: "active",
      showNewTaskField: false,
      showNewSuggestionField: false,
      selectedStaff: [],
      staffMetas: {},
      isPaymentModalOpen: false,
      selectedPaymentStaff: {},
      timesheet: {
        days: [],
        banksArray: [],
        isLoadingPayment: false
      },
      next: false,
      prev: false,
      additionalHours: 0,
      startRate: 0,
      isShowConfirmation: false,
      isShowEditButton: false,
      isShowEditPayableHours: true,
      isShowEditRate: true,
      accName: "",
      accNumber: ""
    }
    this.saveTask = this.saveTask.bind(this)
    this.saveSuggestion = this.saveSuggestion.bind(this)
    this.setSchedules = this.setSchedules.bind(this)
  }
  componentWillMount = async () => {
    API.initRequest()
    let profile = await API.getProfile()
    if (profile.isVenue || profile.isEmployer) {
      this.getMyStaffs()
    }
  }
  componentDidMount = () => {
    console.log(this.props.match.params.tab === undefined)
    const currentTab =
      this.props.match.params.tab !== undefined
        ? this.props.match.params.tab
        : "active"
    console.log(currentTab)
    this.setState({ currentTab })
  }
  setSchedules(sched, staffid) {
    let staffMetas = this.state.staffMetas
    staffMetas[`staff-${staffid}`].schedules = sched
    this.setState({ staffMetas })
    var staffSchedule = {
      schedules: JSON.stringify(sched)
    }
    API.post("save-staff-sched/" + staffid, staffSchedule).then(res => {
      // console.log(res)
    })
  }
  selectStaff = () => {
    let myStaffs = this.state.myStaffs
    myStaffs[0].selected = true
    this.setState({ myStaffs: myStaffs })
    this.setState({ selectedStaff: myStaffs[0] })
  }

  getAllBanks = () => {
    API.get("banks").then(res => {
      if (res.status) {
        this.setState({
          banksArray: res.banks
        })
      } else {
        alert("Something went wrong")
      }
    })
  }

  getMyStaffs = () => {
    API.get("my-staffs?withTrial=true").then(res => {
      if (res && res.status) {
        const allStaff = []
        let staffMetas = {}
        Object.keys(res.staffs).forEach(position => {
          res.staffs[position].forEach(as => {
            if (
              allStaff.length === 0 ||
              !allStaff.find(asf => asf.staff._id === as.staff._id)
            ) {
              allStaff.push(as)
              staffMetas[`staff-${as._id}`] = as
            }
          })
        })
        this.setState({
          myStaffs: allStaff,
          renderStaffsLoading: false,
          staffMetas: staffMetas
        })
        // this.selectStaff()
      }
    })
  }
  renderTasks = tasks => {
    return tasks.reverse().map(task => {
      return this.renderItem(task)
    })
  }
  renderItem = task => {
    return (
      <div key={task._id} className="my-staff-ss-item">
        <div className="my-staff-ss-check">
          <img
            alt=""
            src={require("./../../assets/icons/venue/check-item.png")}
          />
        </div>
        <div className="my-staff-ss-desc">
          <p>{task.description}</p>
        </div>
        <a className="a-btn-circle">—</a>
      </div>
    )
  }
  toggleSchedulePopOver(key) {
    const staffMetas = this.state.staffMetas
    staffMetas[`staff-${key}`].showSchedulePopOver =
      typeof staffMetas[`staff-${key}`].showSchedulePopOver !== "undefined"
        ? !staffMetas[`staff-${key}`].showSchedulePopOver
        : true
    this.setState({ staffMetas })
  }

  togglePaymentModal = staff => {
    this.setState(
      {
        selectedPaymentStaff: staff,
        isPaymentModalOpen: !this.state.isPaymentModalOpen
      },
      () => {
        this.getStaffTimeSheet()
        this.getAllBanks()
      }
    )
  }

  onPressPayStaff = () => {
    alert("I am pressing pay staff")
    if (this.state.timesheet.status == "paid") {
      alert("Staff already paid for this week")
    } else {
      if (this.state.banksArray.length > 0) {
        this.setState({
          accName: this.state.banksArray[0].bankMeta.account_name,
          accNumber: this.state.banksArray[0].bankMeta.account_number
        })
      }
      this.setState({ isShowConfirmation: true })
    }
  }

  onPayStaff = () => {
    // this.setState({isLoadingPayment: true});

    if (this.state.banksArray.length > 0) {
      // console.log(this.state.timesheet)
      const totalPayableHours =
        this.getTotalPayableHours() + this.state.additionalHours * 1
      var totalAmount = totalPayableHours * this.state.startRate

      var promiseId = this.state.banksArray[0].promiseId

      // console.log("total amount", totalAmount)

      API.post(`timesheet/${this.state.timesheet._id}/make_payment`, {
        amount: totalAmount,
        account_id: promiseId
      }).then(res => {
        if (res.status) {
          alert("Payment Transferred.")
          // this.setState({isLoadingPayment: false});
          // this.props.navigation.goBack();
        } else {
          alert(`There is no total amount to be paid.`)
          // this.setState({isLoadingPayment: false});
        }
      })
    } else {
      alert("Please add atleast (1) bank account")
      // this.setState({isLoadingPayment: false});
    }
  }

  getStaffTimeSheet = () => {
    API.get(
      `management/${this.state.selectedPaymentStaff._id}/timesheet/current`
    ).then(res => {
      if (res.status) {
        this.setState({
          startRate: this.state.selectedPaymentStaff.staff.startRate,
          timesheet: res.timesheet,
          next: res.actions.next,
          prev: res.actions.previous
        })
        // this.timeSheetToState(res.timesheet)
      }
    })
  }
  invokeStarRatings = k => {
    if (k.rating === undefined) {
      return <div className="fs-staff-ratings">No ratings available.</div>
    } else {
      let stars = []
      for (var x = 0; x <= 5; x++) {
        if (x <= k.rating.star) {
          stars.push(<i className="fa fa-star" />)
        } else {
          stars.push(<i className="fa fa-star-o" />)
        }
      }
      return <div className="fs-staff-ratings">{stars}</div>
    }
  }
  renderStaffBox(data, index, col, active) {
    if (data.trial) {
      col += " trial"
    } else if (data.active) {
      col += " active"
    }
    const avatar =
      data.staff.avatar !== "undefined"
        ? data.staff.avatar
        : "http://via.placeholder.com/150x150"
    return (
      <div key={data._id} className={"my-staff " + col}>
        <span
          className="icon-calendar"
          onClick={() => {
            this.toggleSchedulePopOver(data._id)
          }}
        />
        <span className="icon-breafcase" />
        <span
          className="icon-time"
          onClick={this.togglePaymentModal.bind(this, data)}
        />
        {data.showSchedulePopOver ? (
          <SchedulePopOver
            staffid={data._id}
            setSchedules={this.setSchedules}
            schedules={data.schedules}
          />
        ) : null}
        <img alt="" className="profile-thumb-md my-staff-img" src={avatar} />
        <p className="staff-name">{data.staff.fullname}</p>
        {this.invokeStarRatings(data.staff)}
        <small className="staff-rate-type">{data.staff.rateType}</small>
        <small className="staff-rate-badge">{data.staff.rateBadge}</small>
        <Link className="btn-send-message" to={`./messages/${data.staff._id}`}>
          <button className="a-btn btn-dark btn-round">
            <small>Send Message</small>
          </button>
        </Link>
        <a className="staff-add-monthly-review">Add monthly review</a>
      </div>
    )
  }
  switchTab = tabname => {
    this.setState({ currentTab: tabname })
  }
  renderNoData = (trialC, activeC) => {
    if (
      (this.state.currentTab === "trial" && trialC == 0) ||
      (this.state.currentTab === "trial" && trialC == 0)
    ) {
      return "Sorry no data here."
    }
  }
  renderMyStaffs = () => {
    let activeC = 0,
      trialC = 0,
      noDataMessage = ""
    return (
      <div className="card my-staff-container">
        <div className="my-staff-header">
          <div className="my-staff-menu">
            <div
              className={
                "my-staff-header-menu" +
                (this.state.currentTab === "active" ? "-active" : "")
              }
              onClick={() => this.switchTab("active")}
            >
              <span>ACTIVE STAFF</span>
            </div>
            <div
              className={
                "my-staff-header-menu" +
                (this.state.currentTab === "trial" ? "-active" : "")
              }
              onClick={() => this.switchTab("trial")}
            >
              <span>TRIAL PERIOD</span>
            </div>
          </div>
          <input
            type="text"
            className="a-plain-text"
            placeholder="Enter name to find Staff"
          />
          <i className="fa fa-search" />
        </div>
        <div className="my-staff-list v-scroll scroll">
          <div className="row">
            {Object.keys(this.state.myStaffs).map(index => {
              if (
                this.state.currentTab === "trial" &&
                this.state.myStaffs[index].trial
              ) {
                trialC++

                return this.renderStaffBox(
                  this.state.myStaffs[index],
                  index,
                  "",
                  false
                )
              } else if (
                this.state.currentTab === "active" &&
                this.state.myStaffs[index].active
              ) {
                activeC++
                return this.renderStaffBox(
                  this.state.myStaffs[index],
                  index,
                  "",
                  true
                )
              }
            })}
            {this.renderNoData(trialC, activeC)}
          </div>
        </div>
      </div>
    )
  }
  renderSelectedStaffBox = staff => {
    return (
      <div key={staff._id} className="a-gradient my-staff-staff-box">
        <div className="row">
          <div className="col-sm-4">
            <img alt="" className="profile-thumb-md" src={staff.staff.avatar} />
          </div>
          <div className="col-sm-8">
            <p className="staff-name">{staff.staff.fullname}</p>
            <p>
              <small>
                {staff.staff.position} | {staff.staff.rateType}
              </small>
            </p>
            <p>
              <small>
                {staff.staff.bio} | {staff.staff.description.join("/")}
              </small>
            </p>
          </div>
        </div>
        <a>&times;</a>
      </div>
    )
  }
  renderEventAssignment = () => {
    return (
      <div className="card my-staff-container">
        <div className="row">
          <div className="my-staff-event-search col-sm-5">
            <p>ADD STAFF TO YOUR EVENT</p>
            <input
              type="text"
              className="a-plain-text"
              placeholder="Enter name to find staff"
            />
            <div className="sem">
              <div className="label">Event</div>
              <div className="a-gradient my-staff-event-box">
                <div className="event-item">
                  <div className="thumb">
                    <img alt="" src="http://via.placeholder.com/112x112" />
                  </div>
                  <div className="content">
                    <p className="title">The Winery Party</p>
                    <p>
                      <small>Cafe / Restaurant</small>
                    </p>
                    <p>
                      <small>Opening: M-F (10AM-11PM)</small>
                    </p>
                    <p>
                      <small>S-SU (12PM-10PM)</small>
                    </p>
                    <p>
                      <i className="fa fa-map-marker" />
                      &nbsp;&nbsp;
                      <small>Surry Hills, CBD Sydney</small>
                    </p>
                    <a>&times;</a>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="my-staff-event-staffs col-sm-7">
            <div className="my-staff-event-staffs-header">
              <p>ADD STAFF TO THIS EVENT</p>
              <input
                type="text"
                className="a-plain-text"
                placeholder="Enter name to find staff"
              />
            </div>
            <div className="my-staff-list v-scroll scroll">
              <div className="row">
                {/*this.state.active.map(active => {
				  return this.renderStaffBox(true, "col-sm-3", active)
				})*/}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
  saveTask = async newTask => {
    this.setState({ isLoading: true })
    let task = this.state.selectedStaff.assignments.tasks
    task.push(newTask)
    var $assignments = {
      assignments: JSON.stringify({
        tasks: task,
        suggestions: this.state.selectedStaff.assignments.suggestions
      })
    }
    API.post(
      "save-staff-assignment/" + this.state.selectedStaff._id,
      $assignments
    ).then(res => {
      // console.log(res)
    })
    this.setState({ isLoading: false })
  }
  saveSuggestion = async newSuggestion => {
    this.setState({ isLoading: true })
    let suggestion = this.state.selectedStaff.assignments.suggestions
    suggestion.push(newSuggestion)
    var $assignments = {
      assignments: JSON.stringify({
        tasks: this.state.selectedStaff.assignments.tasks,
        suggestions: suggestion
      })
    }
    API.post(
      "save-staff-assignment/" + this.state.selectedStaff._id,
      $assignments
    ).then(res => {
      // console.log(res)
    })
    this.setState({ isLoading: false })
  }
  renderStaffManagement = () => {
    return (
      <div className="card my-staff-container">
        <div className="row">
          <div className="my-staff-event-search col-sm-5">
            <p>ASSIGN TASK TO STAFF</p>
            <input
              type="text"
              className="a-plain-text"
              placeholder="Enter name to find staff"
            />
            <div className="sem">
              <p>Selected Staff</p>
              {this.state.myStaffs.map(staff => {
                if (staff.selected) return this.renderSelectedStaffBox(staff)
              })}
            </div>
          </div>
          <div className="my-staff-ts col-sm-7">
            <div className="row">
              <div className="col-sm-6">
                <p>TODAY'S TASK</p>
                <span
                  className="pull-right"
                  onClick={() => this.setState({ showNewTaskField: true })}
                >
                  Add Task&nbsp;&nbsp;&nbsp;
                  <a className="a-btn-circle">+</a>
                </span>
              </div>
              <div className="col-sm-6">
                <p>SUGGESTION</p>
                <span
                  className="pull-right"
                  onClick={() =>
                    this.setState({ showNewSuggestionField: true })
                  }
                >
                  Add Suggestion&nbsp;&nbsp;&nbsp;
                  <a className="a-btn-circle">+</a>
                </span>
              </div>
            </div>
            <div className="my-staff-ss v-scroll scroll">
              <div className="row">
                <div className="my-staff-ss-task col-sm-6">
                  {this.state.showNewTaskField ? (
                    <NewTaskField save={this.saveTask} />
                  ) : null}
                  {this.state.myStaffs.map(staff => {
                    if (staff.active && staff.assignments.tasks !== null) {
                      return this.renderTasks(staff.assignments.tasks)
                    }
                  })}
                </div>
                <div className="my-staff-ss-sugg col-sm-6">
                  {this.state.showNewSuggestionField ? (
                    <NewSuggestionField save={this.saveSuggestion} />
                  ) : null}
                  {this.state.myStaffs.map(staff => {
                    if (
                      staff.active &&
                      staff.assignments.suggestions !== null
                    ) {
                      return this.renderTasks(staff.assignments.suggestions)
                    }
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  timeFormatter = time => {
    if (time != "") {
      return moment(time).format("hh A")
    } else {
      return time
    }
  }

  getNextOrPreviousTimeSheet = id => {
    API.get(`timesheet/${id}`).then(res => {
      if (res.status) {
        this.setState({
          timesheet: res.timesheet,
          next: res.actions.next,
          prev: res.actions.previous,
          isLoadingPayment: false
        })
      }
    })
  }

  getPayableHours(startTime, endTime) {
    let start = moment(startTime, ["hh:mm A", "hh A"])
    let end = moment(endTime, ["hh:mm A", "hh A"])
    let payableHours =
      start.isValid() && end.isValid()
        ? moment.duration(end.diff(start)).asHours()
        : 0
    payableHours = payableHours < 0 ? payableHours + 24 : payableHours
    return payableHours
  }

  getTotalPayableHours() {
    let totalPayableHours = 0
    if (this.state.timesheet.days.length > 0) {
      this.state.timesheet.days.map(res => {
        switch (res.isoWeekPeriod) {
          case "1":
            {
              res.schedules.map((schedule, id) => {
                let startTime = schedule.startTime
                let endTime = schedule.endTime
                if (this.state["monstartTime" + (id + 1)])
                  startTime = this.state["monstartTime" + (id + 1)]
                if (this.state["monendTime" + (id + 1)])
                  endTime = this.state["monendTime" + (id + 1)]
                let payableHours = this.getPayableHours(startTime, endTime)
                totalPayableHours += payableHours
              })
            }
            break
          case "2":
            {
              res.schedules.map((schedule, id) => {
                let startTime = schedule.startTime
                let endTime = schedule.endTime
                if (this.state["tuestartTime" + (id + 1)])
                  startTime = this.state["tuestartTime" + (id + 1)]
                if (this.state["tueendTime" + (id + 1)])
                  endTime = this.state["tueendTime" + (id + 1)]
                let payableHours = this.getPayableHours(startTime, endTime)
                totalPayableHours += payableHours
              })
            }
            break
          case "3":
            {
              res.schedules.map((schedule, id) => {
                let startTime = schedule.startTime
                let endTime = schedule.endTime
                if (this.state["wedstartTime" + (id + 1)])
                  startTime = this.state["wedstartTime" + (id + 1)]
                if (this.state["wedendTime" + (id + 1)])
                  endTime = this.state["wedendTime" + (id + 1)]
                let payableHours = this.getPayableHours(startTime, endTime)
                totalPayableHours += payableHours
              })
            }
            break
          case "4":
            {
              res.schedules.map((schedule, id) => {
                let startTime = schedule.startTime
                let endTime = schedule.endTime
                if (this.state["thustartTime" + (id + 1)])
                  startTime = this.state["thustartTime" + (id + 1)]
                if (this.state["thuendTime" + (id + 1)])
                  endTime = this.state["thuendTime" + (id + 1)]
                let payableHours = this.getPayableHours(startTime, endTime)
                totalPayableHours += payableHours
              })
            }
            break
          case "5":
            {
              res.schedules.map((schedule, id) => {
                let startTime = schedule.startTime
                let endTime = schedule.endTime
                if (this.state["fristartTime" + (id + 1)])
                  startTime = this.state["fristartTime" + (id + 1)]
                if (this.state["friendTime" + (id + 1)])
                  endTime = this.state["friendTime" + (id + 1)]
                let payableHours = this.getPayableHours(startTime, endTime)
                totalPayableHours += payableHours
              })
            }
            break
          case "6":
            {
              res.schedules.map((schedule, id) => {
                let startTime = schedule.startTime
                let endTime = schedule.endTime
                if (this.state["satstartTime" + (id + 1)])
                  startTime = this.state["satstartTime" + (id + 1)]
                if (this.state["satendTime" + (id + 1)])
                  endTime = this.state["satendTime" + (id + 1)]
                let payableHours = this.getPayableHours(startTime, endTime)
                totalPayableHours += payableHours
              })
            }
            break
          case "7":
            {
              res.schedules.map((schedule, id) => {
                let startTime = schedule.startTime
                let endTime = schedule.endTime
                if (this.state["sunstartTime" + (id + 1)])
                  startTime = this.state["sunstartTime" + (id + 1)]
                if (this.state["sunendTime" + (id + 1)])
                  endTime = this.state["sunendTime" + (id + 1)]
                let payableHours = this.getPayableHours(startTime, endTime)
                totalPayableHours += payableHours
              })
            }
            break
          default:
        }
      })
    }
    return totalPayableHours
  }

  editWorkingHours = () => {
    this.setState({ isShowEditButton: !this.state.isShowEditButton })
  }

  onSelectTime = (periodIndex, weekdayIndex, variant, time) => {
    // Updating the timesheet
    const timesheet = this.state.timesheet
    timesheet.days[weekdayIndex].schedules[periodIndex][variant] = time.format(
      "hh:mm A"
    )
    this.setState({ timesheet })
  }

  onSaveBreakTime = (periodIndex, weekdayIndex, breakTime) => {
    // Update the breaktime
    const timesheet = this.state.timesheet
    timesheet.days[weekdayIndex].schedules[periodIndex].break =
      breakTime.target.value
    this.setState({ timesheet })
  }

  renderTimeSheet = () => {
    let total_to_be_sent =
      (this.getTotalPayableHours() + this.state.additionalHours * 1) *
      this.state.startRate
    let attender_fee = Math.round(total_to_be_sent * 0.165)
    let total = total_to_be_sent + attender_fee

    return (
      <div>
        <header>
          <h5>ANDREW O. TIME SHEET</h5>
          <em>July 24 - 30 2017</em>
        </header>
        <div id="btn-edit-working-hours" onClick={this.editWorkingHours}>
          Edit Working Hours <i className="fa fa-edit" />
        </div>
        <div>
          {this.state.next && (
            <button
              onClick={this.getNextOrPreviousTimeSheet.bind(
                this,
                this.state.next
              )}
            >
              Previous
            </button>
          )}
          {this.state.next && <button>Next</button>}
        </div>
        <div className="payment-modal-content">
          <div className="timesheet">
            <table>
              <thead>
                <tr>
                  <th width="20">Date</th>
                  <th width="50">Time(AM)</th>
                  <th width="50">Time(PM)</th>
                  <th width="40">Break hr(s)</th>
                  <th width="30">Payable Hours</th>
                </tr>
              </thead>
              <tbody>
                {this.state.timesheet.days.length > 0 &&
                  this.state.timesheet.days.map((res, weekdayIndex) => (
                    <tr>
                      <td>
                        {moment(res.date).format("ddd")}
                        <br />
                        {moment(res.date).format("MMM DD")}
                      </td>
                      {res.schedules.map(
                        (s, periodIndex) =>
                          !this.state.isShowEditButton ? (
                            <td>{`${s.startTime} - ${s.endTime}`}</td>
                          ) : (
                            <td>
                              <div className="time-container">
                                <div className="time-content">
                                  <StaffTimePicker
                                    selectedTime={moment(s.startTime, [
                                      "hh:mm A",
                                      "hh A"
                                    ])}
                                    onSelectTime={this.onSelectTime.bind(
                                      this,
                                      periodIndex,
                                      weekdayIndex,
                                      "startTime"
                                    )}
                                  />
                                  <br />
                                  to
                                  <br />
                                  <StaffTimePicker
                                    selectedTime={moment(s.endTime, [
                                      "hh:mm A",
                                      "hh A"
                                    ])}
                                    onSelectTime={this.onSelectTime.bind(
                                      this,
                                      periodIndex,
                                      weekdayIndex,
                                      "endTime"
                                    )}
                                  />
                                </div>
                              </div>
                            </td>
                          )
                      )}
                      <td>
                        {res.schedules.map(
                          (s, periodIndex) =>
                            !this.state.isShowEditButton ? (
                              <p>{s.break}</p>
                            ) : (
                              <input
                                type="text"
                                className="a-plain-text"
                                placeholder="0"
                                value={s.break}
                                onChange={this.onSaveBreakTime.bind(
                                  this,
                                  periodIndex,
                                  weekdayIndex
                                )}
                              />
                            )
                        )}
                      </td>
                      <td>
                        {res.schedules.map(s => (
                          <p>8.5</p>
                        ))}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <div className="summary">
            <h5>Payment Details</h5>
            <div className="clearfix">
              <label className="pull-left">Total Payable hours:</label>
              <div className="pull-right">{this.getTotalPayableHours()}</div>
            </div>
            <div className="clearfix">
              <div className="pull-left">
                <label>Payable Hours:</label>
                <br />
                <button
                  onClick={() =>
                    this.setState({
                      isShowEditPayableHours: !this.state.isShowEditPayableHours
                    })
                  }
                >
                  Add Payable Hours
                </button>
              </div>
              <div className="pull-right">
                {this.state.isShowEditPayableHours ? (
                  <input
                    type="text"
                    placeholder="0"
                    onChange={hours =>
                      this.setState({ additionalHours: hours.target.value })
                    }
                  />
                ) : (
                  0
                )}
              </div>
            </div>
            <div className="clearfix">
              <div className="pull-left">
                <label>Rate Per Hours: </label>
                <br />
                <button
                  onClick={() =>
                    this.setState({
                      isShowEditRate: !this.state.isShowEditRate
                    })
                  }
                >
                  Edit Rate
                </button>
              </div>
              {this.state.isShowEditRate ? (
                <div className="pull-right">
                  ${this.state.startRate}
                  /Hr
                </div>
              ) : (
                <input
                  type="text"
                  className="pull-right"
                  placeholder={this.state.startRate}
                  onChange={startRate =>
                    this.setState({ startRate: startRate.target.value })
                  }
                />
              )}
            </div>

            <div className="clearfix">
              <label className="pull-left">Total to be sent:</label>
              <div className="pull-right">AUD ${total_to_be_sent}</div>
            </div>
            <div className="clearfix">
              <label className="pull-left">Attender Fee (16.5%):</label>
              <div className="pull-right">AUD ${attender_fee}</div>
            </div>
            <div className="clearfix grand-total">
              <h3 className="pull-left">Total:</h3>
              <div className="pull-right">AUD ${total}</div>
            </div>
            <Button
              className="btn-primary pull-right"
              onClick={this.onPressPayStaff}
            >
              Pay Staff
            </Button>
          </div>
        </div>
      </div>
    )
  }

  renderPaymentModal = () => {
    return (
      <div
        className={this.state.isPaymentModalOpen ? "a-modal show" : "a-modal"}
      >
        <div className="a-modal-content payment-modal">
          <span
            onClick={this.togglePaymentModal.bind(
              this,
              this.state.selectedPaymentStaff
            )}
            className="a-close"
          >
            &times;
          </span>
          {!this.state.isShowConfirmation ? (
            this.renderTimeSheet()
          ) : (
            <button onClick={this.onPayStaff}>confirm</button>
          )}
        </div>
      </div>
    )
  }

  render() {
    return (
      <div>
        <NavBar />
        <div className="container lem">
          {this.renderMyStaffs()}
          {this.renderEventAssignment()}
          {this.renderStaffManagement()}
          {this.renderPaymentModal()}
        </div>
      </div>
    )
  }
}

const mapStateToProps = state => state

const mapDispatchToProps = dispatch => bindActionCreators({}, dispatch)

MyStaff.contextTypes = {
  router: PropTypes.object
}
export default connect(
  mapStateToProps,
  mapDispatchToProps
)(MyStaff)
