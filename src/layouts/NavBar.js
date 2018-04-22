import React, { Component } from "react"
import { Link } from "react-router-dom"
import { push } from "react-router-redux"
import { bindActionCreators } from "redux"
import { connect } from "react-redux"
import API from ".././services/api"
import QuickLinks from "./QuickLinks"
import "./NavBar.css"

class NavBar extends Component {
  constructor(props) {
    super(props)
    this.state = {
      sideNavOpen: false,
      profile: {},
      showQuickLinks: false
    }
    this.closeQuickLinks = this.closeQuickLinks.bind(this)
    this.openQuickLinks = this.openQuickLinks.bind(this)
  }
  QLtimer
  async componentDidMount() {
    let profile = await API.getProfile()
    this.setState({ profile })
  }
  onLogout = () => {
    API.logout()
    this.props.goMain()
  }

  openSideNav = () => {
    if (this.state.profile.hasProfile) {
      this.setState(prevState => ({ sideNavOpen: !prevState.sideNavOpen }))
    }
  }

  closeQuickLinks() {
    this.QLtimer = setTimeout(() => {
      this.setState({ showQuickLinks: false })
    }, 1000)
  }
  openQuickLinks() {
    clearTimeout(this.QLtimer)
    this.setState({ showQuickLinks: true })
  }

  renderSideMenu = () => {
    return (
      <div
        className="sidemenu"
        style={{ marginLeft: this.state.sideNavOpen ? "0" : "-8em" }}
      >
        <ul className="sidemenu-items list-inline">
          <li>
            <Link to="/messages">
              <div>
                <img
                  alt=""
                  src={require(".././assets/icons/nav/envelope.png")}
                />
              </div>
              <span>Messages</span>
            </Link>
          </li>
          {this.state.profile &&
            this.state.profile.isStaff && (
              <li>
                <Link to="/search-venues">
                  <div>
                    <img
                      alt=""
                      src={require(".././assets/icons/nav/venuesEvents.png")}
                    />
                  </div>
                  <span>Venues / Events</span>
                </Link>
              </li>
            )}
          {this.state.profile &&
            this.state.profile.isStaff && (
              <li>
                <Link to="/earnings">
                  <div>
                    <img
                      alt=""
                      src={require(".././assets/icons/nav/venuesEvents.png")}
                    />
                  </div>
                  <span>Earnings</span>
                </Link>
              </li>
            )}
          {this.state.profile &&
            !this.state.profile.isStaff && (
              <li>
                <Link to="/staffs">
                  <div>
                    <img
                      alt=""
                      src={require(".././assets/icons/nav/staff.png")}
                    />
                  </div>
                  <span>Staffs</span>
                </Link>
              </li>
            )}
          {this.state.profile &&
            !this.state.profile.isStaff && (
              <li>
                <Link to="/find-staff">
                  <div>
                    <img
                      alt=""
                      src={require(".././assets/icons/nav/browse-jobseeker.png")}
                    />
                  </div>
                  <span>Browse Jobseekers</span>
                </Link>
              </li>
            )}
          <li>
            <Link to="/calendar">
              <div>
                <img
                  alt=""
                  src={require(".././assets/icons/nav/calendar.png")}
                />
              </div>
              <span>Calendar</span>
            </Link>
          </li>
          <li>
            <Link to="/settings">
              <div>
                <img
                  alt=""
                  src={require(".././assets/icons/nav/settings.png")}
                />
              </div>
              <span>Settings</span>
            </Link>
          </li>
        </ul>
      </div>
    )
  }

  renderNavBar = () => {
    let img = "http://via.placeholder.com/150x150"
    let name = this.state.profile.fullname || "Attender User"
    if (this.state.profile.isEmployer) {
      img = this.state.profile.employer.image || img
      name = this.state.profile.employer.name || name
    } else if (this.state.profile.isStaff) {
      const { avatar } = this.state.profile.staffId
      img = avatar.includes("undefined") ? img : avatar
      name = this.state.profile.staffId.fullname || name
    }
    return (
      <div className="nav nav-default">
        <div className="nav-header">
          <a
            href="javascript:void(0)"
            className="nav-brand"
            onClick={() => this.openSideNav()}
          >
            <img alt="" src={require(".././assets/logo.png")} />&nbsp;&nbsp;Attender
          </a>
          <ul className="nav-menu list-inline">
            <li>
              <a>
                Hello, <strong>{name}!</strong>
              </a>
            </li>
            <li>
              <img alt="" className="profile-thumb" src={img} />
              <span
                className="toggleQuickLinks fa fa-caret-down"
                onMouseOver={this.openQuickLinks}
                onMouseOut={this.closeQuickLinks}
              />
              {this.state.showQuickLinks ? (
                <QuickLinks
                  onMouseOver={this.openQuickLinks}
                  onMouseOut={this.closeQuickLinks}
                />
              ) : null}
            </li>
            <li>
              <a>
                Log out&nbsp;&nbsp;&nbsp;
                <img
                  alt=""
                  onClick={() => this.onLogout()}
                  src={require(".././assets/icons/nav/logout.png")}
                />
              </a>
            </li>
          </ul>
        </div>
      </div>
    )
  }

  render() {
    return (
      <div>
        {this.renderNavBar()}
        {this.renderSideMenu()}
      </div>
    )
  }
}

const mapDispatchToProps = dispatch =>
  bindActionCreators(
    {
      goMain: () => push("/")
    },
    dispatch
  )

export default connect(null, mapDispatchToProps)(NavBar)
