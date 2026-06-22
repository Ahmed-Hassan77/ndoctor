import {
  Calendar,
  Video,
  CreditCard,
  User,
  FileText,
  ShieldCheck,
} from "lucide-react";

// JSON data for features
export const features = [
  {
    icon: <User className="h-6 w-6 text-primary" />,
    title: "Create Your Profile",
    description:
      "Sign up and complete your profile to get personalized healthcare recommendations and services.",
  },
  {
    icon: <Calendar className="h-6 w-6 text-primary" />,
    title: "Book Appointments",
    description:
      "Browse doctor profiles, check availability, and book appointments that fit your schedule.",
  },
  {
    icon: <Video className="h-6 w-6 text-primary" />,
    title: "Video Consultation",
    description:
      "Connect with doctors through secure, high-quality video consultations from the comfort of your home.",
  },
  {
    icon: <CreditCard className="h-6 w-6 text-primary" />,
    title: "Secure EGP payments",
    description:
      "Pay for online consultations in Egyptian pounds at checkout. Clinic visits are paid at the clinic.",
  },
  {
    icon: <ShieldCheck className="h-6 w-6 text-primary" />,
    title: "Verified Doctors",
    description:
      "All healthcare providers are carefully vetted and verified to ensure quality care.",
  },
  {
    icon: <FileText className="h-6 w-6 text-primary" />,
    title: "Medical Documentation",
    description:
      "Access and manage your appointment history, doctor's notes, and medical recommendations.",
  },
];

// JSON data for testimonials
export const testimonials = [
  {
    initials: "SP",
    name: "Sarah P.",
    role: "Patient",
    quote:
      "The video consultation feature saved me so much time. I was able to get medical advice without taking time off work or traveling to a clinic.",
  },
  {
    initials: "DR",
    name: "Dr. Robert M.",
    role: "Cardiologist",
    quote:
      "This platform has revolutionized my practice. I can now reach more patients and provide timely care without the constraints of a physical office.",
  },
  {
    initials: "JT",
    name: "James T.",
    role: "Patient",
    quote:
      "Paying online before the visit was straightforward, and the cancellation policy was clear when I had to reschedule.",
  },
];

// JSON data for credit system benefits
export const creditBenefits = [
  "Doctors set consultation fees in <strong class='text-primary'>EGP</strong> on their profiles",
  "Pay online with <strong class='text-primary'>card, mobile wallet, or Fawry</strong> (demo gateway)",
  "Clinic visits: <strong class='text-primary'>pay at the clinic</strong>",
  "Refunds follow a clear <strong class='text-primary'>cancellation & no-show policy</strong>",
  "Platform ready to connect a <strong class='text-primary'>real payment provider</strong> later",
];
