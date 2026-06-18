import { getDoctorAppointments, getWorkTimes } from "@/actions/doctor";

import { getDoctorAvailabilityExceptions } from "@/actions/availability-exceptions";

import { getDoctorClinics } from "@/actions/clinics";

import { getCurrentUser } from "@/actions/onboarding";

import { redirect } from "next/navigation";

import { DoctorDashboardTabs } from "./_components/doctor-dashboard-tabs";

import { getDoctorEarnings, getDoctorPayouts } from "@/actions/payout";



export default async function DoctorDashboardPage() {

  const user = await getCurrentUser();



  if (user?.role !== "DOCTOR") {

    redirect("/onboarding");

  }



  if (user?.verificationStatus !== "VERIFIED") {

    redirect("/doctor/verification");

  }



  const [

    onlineWorkRes,

    offlineWorkRes,

    appointmentsData,

    earningsData,

    payoutsData,

    exceptionsRes,

    clinicsRes,

  ] = await Promise.all([

    getWorkTimes(undefined, "ONLINE"),

    getWorkTimes(undefined, "OFFLINE"),

    getDoctorAppointments(),

    getDoctorEarnings(),

    getDoctorPayouts(),

    getDoctorAvailabilityExceptions(),

    getDoctorClinics(),

  ]);



  const initialClinics =

    clinicsRes?.success === true ? clinicsRes.clinics ?? [] : [];

  const initialExceptions =

    exceptionsRes?.success === true ? exceptionsRes.exceptions ?? [] : [];



  const onlineList = onlineWorkRes?.success ? onlineWorkRes.workTimes ?? [] : [];

  const offlineList = offlineWorkRes?.success

    ? offlineWorkRes.workTimes ?? []

    : [];



  const serializeWorkTimes = (list) =>

    JSON.stringify(

      list.map((w) => ({

        i: w.id,

        d: w.dayOfWeek,

        s: w.startTime,

        e: w.endTime,

      }))

    );



  const workTimeKeyOnline = serializeWorkTimes(onlineList);

  const workTimeKeyOffline = serializeWorkTimes(offlineList);



  return (

    <DoctorDashboardTabs

      user={user}

      activeAppointments={appointmentsData.activeAppointments ?? []}

      historyAppointments={appointmentsData.historyAppointments ?? []}

      earnings={earningsData.earnings || {}}

      payouts={payoutsData.payouts || []}

      initialClinics={initialClinics}

      initialExceptions={initialExceptions}

      onlineWorkTimes={onlineList}

      offlineWorkTimes={offlineList}

      workTimeKeyOnline={workTimeKeyOnline}

      workTimeKeyOffline={workTimeKeyOffline}

    />

  );

}

